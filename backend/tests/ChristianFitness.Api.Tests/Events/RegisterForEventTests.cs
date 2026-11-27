using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>The API on a clock the tests hold, with the real registrations (ADR 0032).</summary>
public sealed class RegisterForEventFactory : ApiFactory
{
    public static readonly DateTimeOffset Now = new(2026, 4, 15, 12, 45, 0, TimeSpan.Zero);

    public FakeTimeProvider Time { get; } = new(Now);

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(Time);
    }

    public async Task<Guid> AddEventAsync(string title, bool published = true, int priceCents = 0, int capacity = 50, TimeSpan? startsIn = null)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var e = Event.CreateDraft(title, EventCategory.Run, Now + (startsIn ?? TimeSpan.FromDays(3)), "Martin Goodman Trail", "Waterfront, Toronto", priceCents, capacity, "Come run with us.", Now);
        if (published)
        {
            e.Publish(e.CreatedAt);
        }

        db.Events.Add(e);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return e.Id;
    }

    public async Task SuspendAsync(string email)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var normalized = Member.NormalizeEmail(email);
        var member = await db.Members.SingleAsync(m => m.NormalizedEmail == normalized, TestContext.Current.CancellationToken);
        db.Entry(member).Property(m => m.Status).CurrentValue = MemberStatus.Suspended;
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }
}

/// <summary>
/// L2-011 AC1, AC2, AC4, AC5 and AC6 and L2-010 AC3 (ADR 0032): a member registers for a published
/// event and the event shows them as going; a repeat changes nothing; a paid event is reserved; a
/// full event, a suspended member and an unknown event are refused with their codes.
/// </summary>
public sealed class RegisterForEventTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private static string PathOf(Guid id) => $"/api/events/{id}";

    private static string RegisterPath(Guid id) => $"/api/events/{id}/registrations";

    private async Task<(HttpClient Client, string Cookie)> MemberAsync(string email)
    {
        var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        return (client, cookie);
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, string cookie, HttpMethod method, string path, HttpStatusCode expected)
    {
        using var response = await Browser.SendAsync(client, method, path, cookie);
        Assert.Equal(expected, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Given_nobody_signed_in_When_registering_Then_it_is_unauthorized()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Post, RegisterPath(Guid.NewGuid()), cookie: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_free_event_with_places_When_a_member_registers_Then_they_are_going_and_only_they_see_it()
    {
        var id = await factory.AddEventAsync("Free Run");
        var (grace, graceCookie) = await MemberAsync("grace.register@example.org");
        var (hope, hopeCookie) = await MemberAsync("hope.register@example.org");

        var before = await ReadAsync(grace, graceCookie, HttpMethod.Get, PathOf(id), HttpStatusCode.OK);
        var registered = await ReadAsync(grace, graceCookie, HttpMethod.Post, RegisterPath(id), HttpStatusCode.OK);
        var graceView = await ReadAsync(grace, graceCookie, HttpMethod.Get, PathOf(id), HttpStatusCode.OK);
        var hopeView = await ReadAsync(hope, hopeCookie, HttpMethod.Get, PathOf(id), HttpStatusCode.OK);

        Assert.Equal((0, JsonValueKind.Null), (before.GetProperty("going").GetInt32(), before.GetProperty("registration").ValueKind));
        Assert.Equal((1, "confirmed"), (registered.GetProperty("going").GetInt32(), registered.GetProperty("registration").GetString()));
        Assert.Equal((1, "confirmed"), (graceView.GetProperty("going").GetInt32(), graceView.GetProperty("registration").GetString()));
        Assert.Equal((1, JsonValueKind.Null), (hopeView.GetProperty("going").GetInt32(), hopeView.GetProperty("registration").ValueKind));
    }

    [Fact]
    public async Task Given_a_registered_member_When_they_register_again_Then_no_second_registration_is_made()
    {
        var id = await factory.AddEventAsync("Twice Run");
        var (client, cookie) = await MemberAsync("grace.twice@example.org");
        await ReadAsync(client, cookie, HttpMethod.Post, RegisterPath(id), HttpStatusCode.OK);

        var again = await ReadAsync(client, cookie, HttpMethod.Post, RegisterPath(id), HttpStatusCode.OK);

        Assert.Equal((1, "confirmed"), (again.GetProperty("going").GetInt32(), again.GetProperty("registration").GetString()));
    }

    [Fact]
    public async Task Given_a_paid_event_When_a_member_registers_Then_the_registration_is_reserved()
    {
        var id = await factory.AddEventAsync("Paid Run", priceCents: 1000);
        var (client, cookie) = await MemberAsync("grace.paid@example.org");

        var registered = await ReadAsync(client, cookie, HttpMethod.Post, RegisterPath(id), HttpStatusCode.OK);

        Assert.Equal((1, "reserved"), (registered.GetProperty("going").GetInt32(), registered.GetProperty("registration").GetString()));
    }

    [Fact]
    public async Task Given_a_full_event_When_another_member_registers_Then_it_is_refused_event_full()
    {
        var id = await factory.AddEventAsync("Tiny Run", capacity: 1);
        var (first, firstCookie) = await MemberAsync("grace.first@example.org");
        var (second, secondCookie) = await MemberAsync("hope.second@example.org");
        await ReadAsync(first, firstCookie, HttpMethod.Post, RegisterPath(id), HttpStatusCode.OK);

        var refusal = await ReadAsync(second, secondCookie, HttpMethod.Post, RegisterPath(id), HttpStatusCode.Conflict);

        Assert.Equal("event_full", refusal.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_suspended_member_When_they_register_Then_it_is_refused_account_suspended()
    {
        var id = await factory.AddEventAsync("Suspended Run");
        var (client, cookie) = await MemberAsync("grace.suspended@example.org");
        await factory.SuspendAsync("grace.suspended@example.org");

        var refusal = await ReadAsync(client, cookie, HttpMethod.Post, RegisterPath(id), HttpStatusCode.Forbidden);

        Assert.Equal("account_suspended", refusal.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_draft_or_unknown_event_When_a_member_registers_Then_it_is_not_found()
    {
        var draft = await factory.AddEventAsync("Draft Run", published: false);
        var (client, cookie) = await MemberAsync("grace.notfound@example.org");

        var forDraft = await ReadAsync(client, cookie, HttpMethod.Post, RegisterPath(draft), HttpStatusCode.NotFound);
        var forUnknown = await ReadAsync(client, cookie, HttpMethod.Post, RegisterPath(Guid.NewGuid()), HttpStatusCode.NotFound);

        Assert.Equal(("event_not_found", "event_not_found"), (forDraft.GetProperty("code").GetString(), forUnknown.GetProperty("code").GetString()));
    }
}
