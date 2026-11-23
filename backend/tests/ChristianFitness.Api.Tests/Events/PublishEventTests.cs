using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-023 AC3 to AC5 (ADR 0026): publishing moves a draft to Published, refuses anything else, a
/// draft that has begun and an unknown event, and is a staff change that leaves one audit entry.
/// A draft that has begun is in <see cref="PublishPastDraftTests"/>, which moves the clock.
/// </summary>
public sealed class PublishEventTests(AdminEventsFactory factory) : IClassFixture<AdminEventsFactory>
{
    [Fact]
    public async Task Given_a_draft_When_staff_publish_it_Then_it_is_published_in_the_answer_and_in_the_list()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.publish@example.org");
        var id = await AdminEvents.CreatedIdAsync(client, cookie, AdminEvents.Retreat());

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Post, $"/api/admin/events/{id}/publish", cookie);
        using var published = await AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/events?status=published", cookie);
        using var drafts = await AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/events?status=draft", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal((id.ToString(), "Whole Life Retreat", "published"), (body.GetProperty("id").GetString(), body.GetProperty("title").GetString(), body.GetProperty("status").GetString()));
        var listed = (await published.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("events").EnumerateArray().Select(e => e.GetProperty("id").GetString());
        Assert.Contains(id.ToString(), listed);
        var drafted = (await drafts.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("events").EnumerateArray().Select(e => e.GetProperty("id").GetString());
        Assert.DoesNotContain(id.ToString(), drafted);
    }

    [Fact]
    public async Task Given_a_published_event_When_staff_publish_it_again_Then_it_is_refused_with_event_not_draft()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.publish.twice@example.org");
        var id = await AdminEvents.CreatedIdAsync(client, cookie, AdminEvents.Retreat());
        using var first = await AdminEvents.SendAsync(client, HttpMethod.Post, $"/api/admin/events/{id}/publish", cookie);

        using var again = await AdminEvents.SendAsync(client, HttpMethod.Post, $"/api/admin/events/{id}/publish", cookie);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        Assert.Equal("event_not_draft", (await again.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_an_unknown_event_When_staff_publish_it_Then_it_answers_404_not_found()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.publish.unknown@example.org");

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Post, $"/api/admin/events/{Guid.NewGuid()}/publish", cookie);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_published_event_When_it_is_published_Then_one_audit_entry_names_who_published_which_event()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.publish.audit@example.org");
        var id = await AdminEvents.CreatedIdAsync(client, cookie, AdminEvents.Retreat());

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Post, $"/api/admin/events/{id}/publish", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var staffId = await db.Members.Where(m => m.NormalizedEmail == "dana.publish.audit@example.org").Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var entry = Assert.Single(await db.AuditEntries.Where(e => e.RecordId == id && e.Action == "event.published").ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((staffId, "Event"), (entry.ActorMemberId, entry.RecordType));
    }

    [Fact]
    public async Task Given_a_refused_publish_When_it_is_read_back_Then_the_event_is_still_a_draft_and_nothing_is_audited()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.publish.refused@example.org");
        var id = await AdminEvents.CreatedIdAsync(client, cookie, AdminEvents.Retreat());
        using var first = await AdminEvents.SendAsync(client, HttpMethod.Post, $"/api/admin/events/{id}/publish", cookie);
        using var again = await AdminEvents.SendAsync(client, HttpMethod.Post, $"/api/admin/events/{id}/publish", cookie);

        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Single(await db.AuditEntries.Where(e => e.RecordId == id && e.Action == "event.published").ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
    }

    [Fact]
    public async Task Given_nobody_signed_in_When_an_event_is_published_Then_it_is_unauthorized()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Post, $"/api/admin/events/{Guid.NewGuid()}/publish", cookie: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
