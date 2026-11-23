using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Domain.Events;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-022 AC5 (ADR 0021): staff see the events soonest first with each tab's count; a tab asks
/// only for its own events, and the list holds at most 100. Each test starts its own API, so the
/// counts it asserts are exactly the events it made.
/// </summary>
public sealed class ListAdminEventsTests
{
    [Fact]
    public async Task Given_events_made_out_of_order_When_staff_list_all_Then_they_come_soonest_first_with_the_counts()
    {
        using var factory = new AdminEventsFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.list@example.org");
        await CreateAsync(client, cookie, "Whole Life Retreat", "2026-05-22", "16:00");
        await CreateAsync(client, cookie, "Easter Sunrise 5K", "2026-04-18", "06:45");
        await CreateAsync(client, cookie, "Stretch & Pray: Mobility Morning", "2026-05-06", "09:30");

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/events", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var list = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["counts", "events"], list.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(3, list.GetProperty("counts").GetProperty("all").GetInt32());
        Assert.Equal(0, list.GetProperty("counts").GetProperty("published").GetInt32());
        Assert.Equal(3, list.GetProperty("counts").GetProperty("draft").GetInt32());
        Assert.Equal(
            ["Easter Sunrise 5K", "Stretch & Pray: Mobility Morning", "Whole Life Retreat"],
            list.GetProperty("events").EnumerateArray().Select(e => e.GetProperty("title").GetString()));
        var first = list.GetProperty("events")[0];
        Assert.Equal("2026-04-18T10:45:00+00:00", first.GetProperty("startsAt").GetString());
        Assert.Equal("draft", first.GetProperty("status").GetString());
        Assert.Equal(0, first.GetProperty("going").GetInt32());
    }

    [Theory]
    [InlineData("draft", new[] { "Easter Sunrise 5K", "Whole Life Retreat" })]
    [InlineData("published", new[] { "Saturday Park Bootcamp" })]
    [InlineData("all", new[] { "Easter Sunrise 5K", "Saturday Park Bootcamp", "Whole Life Retreat" })]
    public async Task Given_drafts_and_a_published_event_When_staff_ask_for_a_tab_Then_only_its_events_come_with_every_count(string status, string[] titles)
    {
        using var factory = new AdminEventsFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.tabs@example.org");
        await CreateAsync(client, cookie, "Whole Life Retreat", "2026-05-22", "16:00");
        await CreateAsync(client, cookie, "Easter Sunrise 5K", "2026-04-18", "06:45");
        var bootcamp = await CreateAsync(client, cookie, "Saturday Park Bootcamp", "2026-04-25", "08:00");
        await PublishInStoreAsync(factory, bootcamp);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"/api/admin/events?status={status}", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var list = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(titles, list.GetProperty("events").EnumerateArray().Select(e => e.GetProperty("title").GetString()));
        Assert.Equal(3, list.GetProperty("counts").GetProperty("all").GetInt32());
        Assert.Equal(1, list.GetProperty("counts").GetProperty("published").GetInt32());
        Assert.Equal(2, list.GetProperty("counts").GetProperty("draft").GetInt32());
    }

    [Fact]
    public async Task Given_101_events_When_staff_list_them_Then_the_100_soonest_come_and_the_count_says_101()
    {
        using var factory = new AdminEventsFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.hundred@example.org");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            for (var day = 0; day < 101; day++)
            {
                db.Events.Add(Event.CreateDraft(
                    $"Event {day:D3}", EventCategory.Run, AdminEvents.Today.AddDays(day + 1), "Trillium Park", "Waterfront, Toronto", 0, 50, "A run.", AdminEvents.Today));
            }

            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/events", cookie);

        var list = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(101, list.GetProperty("counts").GetProperty("all").GetInt32());
        var titles = list.GetProperty("events").EnumerateArray().Select(e => e.GetProperty("title").GetString()).ToList();
        Assert.Equal(100, titles.Count);
        Assert.Equal("Event 000", titles[0]);
        Assert.Equal("Event 099", titles[^1]);
    }

    [Fact]
    public async Task Given_an_unknown_tab_When_staff_ask_for_it_Then_it_is_refused_with_400_validation_failed()
    {
        using var factory = new AdminEventsFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.unknown.tab@example.org");

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/events?status=cancelled", cookie);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_member_session_When_it_lists_admin_events_Then_it_is_refused_with_401()
    {
        using var factory = new AdminEventsFactory();
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "grace.list@example.org", role: null);
        using var signedIn = await Browser.SignInAsync(client, "grace.list@example.org", Staff.Password);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/events", Browser.SessionCookie(signedIn));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static async Task<Guid> CreateAsync(HttpClient client, string cookie, string title, string date, string startTime)
    {
        var body = AdminEvents.Retreat();
        body["title"] = title;
        body["date"] = date;
        body["startTime"] = startTime;
        using var response = await AdminEvents.CreateAsync(client, cookie, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return Guid.Parse(created.GetProperty("id").GetString()!);
    }

    /// <summary>
    /// Publishes an event in the store, as slice 11.1's Publish will: no endpoint publishes yet
    /// (lessons learned, slice 3.2: write through EF Core's entry, leaving the domain without a
    /// method nobody calls).
    /// </summary>
    private static async Task PublishInStoreAsync(AdminEventsFactory factory, Guid id)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var stored = await db.Events.FindAsync([id], TestContext.Current.CancellationToken);
        db.Entry(stored!).Property(e => e.Status).CurrentValue = EventStatus.Published;
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }
}
