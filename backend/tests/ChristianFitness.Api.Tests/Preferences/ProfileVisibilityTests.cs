using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Events;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Preferences;

/// <summary>
/// L2-065 AC2, AC3 and AC10 to AC12 (journey 34, slice 2): a profile opens for the member, for
/// anyone when it is Anyone, for a signed-in member when it is Members, and for a member who shares
/// a group chat when it is Just my groups; otherwise it is the same 404 <c>not_found</c> an unknown
/// id gives. A visitor reads an Anyone profile at the public address, with name, bio and interests
/// only. A shared event chat counts while both hold their place, even once the event is cancelled.
/// </summary>
public sealed class ProfileVisibilityTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private static string MemberPath(Guid id) => $"/api/members/{id}/profile";

    private static string PublicPath(object id) => $"/api/public/members/{id}";

    // Each row: the owner's visibility, whether the viewer shares a group, and what a signed-in member and a visitor get.
    [Theory]
    [InlineData("anyone", false, HttpStatusCode.OK, HttpStatusCode.OK)]
    [InlineData("members", false, HttpStatusCode.OK, HttpStatusCode.NotFound)]
    [InlineData("groups", false, HttpStatusCode.NotFound, HttpStatusCode.NotFound)]
    [InlineData("groups", true, HttpStatusCode.OK, HttpStatusCode.NotFound)]
    public async Task Given_a_visibility_When_a_member_and_a_visitor_open_the_profile_Then_each_gets_it_or_the_not_found_answer(
        string visibility, bool sharesGroup, HttpStatusCode forMember, HttpStatusCode forVisitor)
    {
        using var client = Browser.CreateClient(factory);
        var tag = $"{visibility}.{sharesGroup}";
        var (owner, ownerId) = await Prefs.JoinAsync(factory, client, $"owner.{tag}@example.org");
        var (viewer, viewerId) = await Prefs.JoinAsync(factory, client, $"viewer.{tag}@example.org");
        await SaveAsync(client, owner, visibility, showHomeChurch: true);
        if (sharesGroup)
        {
            await ShareEventAsync(ownerId, viewerId);
        }

        using var asMember = await Browser.SendAsync(client, HttpMethod.Get, MemberPath(ownerId), viewer);
        using var asVisitor = await Browser.SendAsync(client, HttpMethod.Get, PublicPath(ownerId), cookie: null);
        using var asOwner = await Browser.SendAsync(client, HttpMethod.Get, MemberPath(ownerId), owner);

        Assert.Equal(forMember, asMember.StatusCode);
        Assert.Equal(forVisitor, asVisitor.StatusCode);
        Assert.Equal(HttpStatusCode.OK, asOwner.StatusCode);
        if (forMember == HttpStatusCode.OK)
        {
            // A signed-in viewer admitted to the profile sees the church the member chose to show (AC10).
            Assert.True((await JsonAsync(asMember)).TryGetProperty("homeChurch", out _));
        }
        else
        {
            Assert.Equal("not_found", (await JsonAsync(asMember)).GetProperty("code").GetString());
        }

        if (forVisitor == HttpStatusCode.OK)
        {
            // A visitor gets name, bio and interests only: never the church, whatever the switch (AC3, AC12).
            Assert.Equal(["bio", "interests", "name"], (await JsonAsync(asVisitor)).EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        }
    }

    [Fact]
    public async Task Given_ids_that_are_malformed_unknown_or_not_Anyone_When_a_visitor_asks_Then_every_answer_is_the_same_404()
    {
        using var client = Browser.CreateClient(factory);
        var (_, hiddenId) = await Prefs.JoinAsync(factory, client, "owner.same404@example.org");

        var answers = new List<string>();
        foreach (var id in new object[] { hiddenId, Guid.NewGuid(), "not-an-id" })
        {
            using var response = await Browser.SendAsync(client, HttpMethod.Get, PublicPath(id), cookie: null);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            var problem = await JsonAsync(response);
            answers.Add($"{problem.GetProperty("code").GetString()}|{problem.GetProperty("title").GetString()}");
        }

        Assert.Single(answers.Distinct(StringComparer.Ordinal));
        Assert.StartsWith("not_found|", answers[0], StringComparison.Ordinal);
    }

    [Fact]
    public async Task Given_a_shared_event_chat_When_the_event_is_cancelled_it_still_counts_and_when_one_leaves_it_no_longer_does()
    {
        using var client = Browser.CreateClient(factory);
        var (owner, ownerId) = await Prefs.JoinAsync(factory, client, "owner.leaves@example.org");
        var (viewer, viewerId) = await Prefs.JoinAsync(factory, client, "viewer.leaves@example.org");
        await SaveAsync(client, owner, "groups", showHomeChurch: false);
        var eventId = await ShareEventAsync(ownerId, viewerId);
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            (await db.Events.SingleAsync(e => e.Id == eventId, TestContext.Current.CancellationToken)).Cancel();
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        using var whileCancelled = await Browser.SendAsync(client, HttpMethod.Get, MemberPath(ownerId), viewer);
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Registrations.Remove(await db.Registrations.SingleAsync(r => r.EventId == eventId && r.MemberId == viewerId, TestContext.Current.CancellationToken));
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        using var afterLeaving = await Browser.SendAsync(client, HttpMethod.Get, MemberPath(ownerId), viewer);

        Assert.Equal(HttpStatusCode.OK, whileCancelled.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, afterLeaving.StatusCode);
    }

    private static async Task SaveAsync(HttpClient client, string cookie, string visibility, bool showHomeChurch)
    {
        var body = Prefs.Body();
        body["privacy"] = new { visibility, showHomeChurch, showOnAttendeeLists = true, letAnyoneMessage = false };
        using var saved = await Prefs.SaveAsync(client, cookie, body);
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
    }

    /// <summary>Puts both members in one published event's chat, and answers the event's id.</summary>
    private async Task<Guid> ShareEventAsync(Guid a, Guid b)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = factory.Time.GetUtcNow();
        var shared = Event.CreateDraft("Shared run", EventCategory.Run, now.AddDays(3), "Marilyn Bell Park", "Waterfront, Toronto", 0, 50, "A summary.", now, null);
        shared.Publish(shared.CreatedAt);
        db.Events.Add(shared);
        db.Registrations.Add(Registration.Of(shared.Id, a, 0, now));
        db.Registrations.Add(Registration.Of(shared.Id, b, 0, now));
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return shared.Id;
    }

    private static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
}
