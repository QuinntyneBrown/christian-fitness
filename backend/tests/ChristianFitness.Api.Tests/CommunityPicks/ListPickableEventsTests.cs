using System.Net;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Api.Tests.CommunityPicks;

/// <summary>
/// L2-072 AC1, AC11 and AC13 (ADR 0098): Community Pick lists the published events still to come,
/// soonest first, with what the graphics and captions need and when each was last picked, and the
/// member app's public address for the links; a Moderator reads it as an Admin does. Each test
/// starts its own API, so the list it asserts is exactly the events it made.
/// </summary>
public sealed class ListPickableEventsTests
{
    [Fact]
    public async Task Given_published_events_When_staff_list_them_Then_they_come_soonest_first_with_spots_left_and_the_latest_pick()
    {
        using var factory = new CommunityPickFactory();
        var bootcamp = await factory.AddEventAsync("Saturday Park Bootcamp", TimeSpan.FromDays(10), going: 38, capacity: 50, priceCents: 1500, imageKey: "0190c0de000070008000000000000002.jpg", place: "Trillium Park, Ontario Place");
        var sunrise = await factory.AddEventAsync("Easter Sunrise 5K", TimeSpan.FromDays(3), going: 142, capacity: 200);
        var hoops = await factory.AddEventAsync("Women's Hoops & Devotion Night", TimeSpan.FromDays(15), going: 31, capacity: 30, area: "Downtown, Toronto");
        await factory.AddPickAsync(hoops, AdminEvents.Today.AddDays(-30));
        await factory.AddPickAsync(hoops, AdminEvents.Today.AddDays(-9));
        await factory.AddPickAsync(hoops, AdminEvents.Today.AddDays(-20));
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminCommunityPicks.SignInAsync(factory, client, "dana.pick.list@example.org");

        using var response = await AdminCommunityPicks.ListAsync(client, cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await AdminCommunityPicks.JsonAsync(response);
        Assert.Equal(["siteOrigin", "events"], AdminCommunityPicks.Keys(answer));
        Assert.Equal("https://members.example.test", answer.GetProperty("siteOrigin").GetString());
        var events = answer.GetProperty("events").EnumerateArray().ToArray();
        Assert.Equal([sunrise, bootcamp, hoops], events.Select(e => e.GetProperty("id").GetGuid()));
        Assert.All(events, e => Assert.Equal(
            ["id", "title", "category", "startsAt", "place", "area", "priceCents", "spotsLeft", "imageKey", "lastPickedAt"],
            AdminCommunityPicks.Keys(e)));

        var first = events[0];
        Assert.Equal("Easter Sunrise 5K", first.GetProperty("title").GetString());
        Assert.Equal("run", first.GetProperty("category").GetString());
        Assert.Equal("2026-04-18T12:45:00+00:00", first.GetProperty("startsAt").GetString());
        Assert.Equal("Martin Goodman Trail, Marilyn Bell Park", first.GetProperty("place").GetString());
        Assert.Equal("Waterfront, Toronto", first.GetProperty("area").GetString());
        Assert.Equal(0, first.GetProperty("priceCents").GetInt32());
        Assert.Equal(58, first.GetProperty("spotsLeft").GetInt32());
        Assert.Equal(JsonValueKind.Null, first.GetProperty("imageKey").ValueKind);
        Assert.Equal(JsonValueKind.Null, first.GetProperty("lastPickedAt").ValueKind);

        Assert.Equal(1500, events[1].GetProperty("priceCents").GetInt32());
        Assert.Equal(12, events[1].GetProperty("spotsLeft").GetInt32());
        Assert.Equal("0190c0de000070008000000000000002.jpg", events[1].GetProperty("imageKey").GetString());

        // More going than places (a capacity lowered since) still leaves none, never fewer than none.
        Assert.Equal(0, events[2].GetProperty("spotsLeft").GetInt32());
        Assert.Equal("2026-04-06T12:45:00+00:00", events[2].GetProperty("lastPickedAt").GetString());
    }

    [Fact]
    public async Task Given_drafts_cancelled_and_started_events_When_staff_list_the_picks_Then_only_published_events_to_come_are_listed()
    {
        using var factory = new CommunityPickFactory();
        await factory.AddEventAsync("A draft", TimeSpan.FromDays(2), EventStatus.Draft);
        await factory.AddEventAsync("A cancelled event", TimeSpan.FromDays(2), EventStatus.Cancelled);
        await factory.AddEventAsync("Started a minute ago", TimeSpan.FromMinutes(-1));
        await factory.AddEventAsync("Starting now", TimeSpan.Zero);
        var soon = await factory.AddEventAsync("Starting in a minute", TimeSpan.FromMinutes(1));
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminCommunityPicks.SignInAsync(factory, client, "dana.pick.filter@example.org");

        using var response = await AdminCommunityPicks.ListAsync(client, cookie);

        var events = (await AdminCommunityPicks.JsonAsync(response)).GetProperty("events").EnumerateArray();
        Assert.Equal([soon], events.Select(e => e.GetProperty("id").GetGuid()));
    }

    [Fact]
    public async Task Given_101_published_events_When_staff_list_the_picks_Then_the_100_soonest_come()
    {
        using var factory = new CommunityPickFactory();
        var ids = new List<Guid>();
        for (var day = 1; day <= 101; day++)
        {
            ids.Add(await factory.AddEventAsync($"Day {day}", TimeSpan.FromDays(day)));
        }

        using var client = Browser.CreateClient(factory);
        var cookie = await AdminCommunityPicks.SignInAsync(factory, client, "dana.pick.cap@example.org");

        using var response = await AdminCommunityPicks.ListAsync(client, cookie);

        var events = (await AdminCommunityPicks.JsonAsync(response)).GetProperty("events").EnumerateArray();
        Assert.Equal(ids.Take(100), events.Select(e => e.GetProperty("id").GetGuid()));
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_list_the_picks_Then_they_get_the_events_as_an_Admin_does()
    {
        using var factory = new CommunityPickFactory();
        var sunrise = await factory.AddEventAsync("Easter Sunrise 5K", TimeSpan.FromDays(3));
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminCommunityPicks.SignInAsync(factory, client, "joel.pick.list@example.org", StaffRoleName.Moderator);

        using var response = await AdminCommunityPicks.ListAsync(client, cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var events = (await AdminCommunityPicks.JsonAsync(response)).GetProperty("events").EnumerateArray();
        Assert.Equal([sunrise], events.Select(e => e.GetProperty("id").GetGuid()));
    }

    [Fact]
    public async Task Given_no_staff_session_When_the_picks_are_asked_for_Then_it_is_refused_unauthenticated()
    {
        using var factory = new CommunityPickFactory();
        using var client = Browser.CreateClient(factory);

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, AdminCommunityPicks.EventsPath, null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
