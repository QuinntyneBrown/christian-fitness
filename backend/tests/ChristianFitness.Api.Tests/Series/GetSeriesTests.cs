using System.Net;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-071 AC2, AC3 and AC6 (ADR 0080, ADR 0091): the chosen series shows its image, title, host,
/// cadence, dates, place, joined of capacity, prices and sessions left of held; its sessions are in
/// date order, each numbered among all of them (cancelled included), with the state the API's clock
/// gives: Done, Live, upcoming or Cancelled.
/// </summary>
public sealed class GetSeriesTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    [Fact]
    public async Task Given_Couch_to_5K_When_staff_open_it_Then_its_facts_and_sessions_answer_as_the_mock_draws_them()
    {
        var now = factory.Time.GetUtcNow();
        var host = await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");
        var couch = AdminSeries.NewSeries("Couch to 5K Run Club", now, capacity: 40, priceCents: 6400, dropInPriceCents: 1000, host: host);
        var ids = await factory.AddCouchTo5KAsync(couch);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.get@example.org");

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, $"/api/admin/series/{couch.Id}", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var series = await AdminSeries.JsonAsync(response);
        Assert.Equal(
            [
                "id", "title", "category", "summary", "imageKey", "host", "cadence", "startsAt", "firstStartsAt", "lastStartsAt",
                "place", "area", "priceCents", "dropInPriceCents", "capacity", "joined", "sessionsLeft", "sessionsHeld", "sessions",
            ],
            AdminSeries.Keys(series));
        Assert.Equal("Couch to 5K Run Club", series.GetProperty("title").GetString());
        Assert.Equal("run", series.GetProperty("category").GetString());
        Assert.Equal(JsonValueKind.Null, series.GetProperty("imageKey").ValueKind);
        Assert.Equal("Lakeshore Runners Fellowship", series.GetProperty("host").GetProperty("name").GetString());
        Assert.Equal(host.ToString(), series.GetProperty("host").GetProperty("id").GetString());
        Assert.Equal(2, series.GetProperty("cadence").GetProperty("weekday").GetInt32());
        Assert.Equal(AdminSeries.At(new DateOnly(2026, 4, 7)), series.GetProperty("firstStartsAt").GetDateTimeOffset());
        Assert.Equal(AdminSeries.At(new DateOnly(2026, 5, 26)), series.GetProperty("lastStartsAt").GetDateTimeOffset());
        Assert.Equal("Humber Bay Park East", series.GetProperty("place").GetString());
        Assert.Equal(6400, series.GetProperty("priceCents").GetInt32());
        Assert.Equal(1000, series.GetProperty("dropInPriceCents").GetInt32());
        Assert.Equal(40, series.GetProperty("capacity").GetInt32());
        Assert.Equal(31, series.GetProperty("joined").GetInt32());
        // April 21, 28, May 5, 19 and 26 are left; May 12 is cancelled, so 7 are held (ADR 0080).
        Assert.Equal(5, series.GetProperty("sessionsLeft").GetInt32());
        Assert.Equal(7, series.GetProperty("sessionsHeld").GetInt32());

        var sessions = series.GetProperty("sessions").EnumerateArray().ToList();
        Assert.Equal(["id", "number", "startsAt", "endsAt", "topic", "state", "started", "joinedGoing", "droppedInGoing"], AdminSeries.Keys(sessions[0]));
        Assert.Equal(ids.Select(id => id.ToString()), sessions.Select(s => s.GetProperty("id").GetString()));
        Assert.Equal([1, 2, 3, 4, 5, 6, 7, 8], sessions.Select(s => s.GetProperty("number").GetInt32()));
        Assert.Equal(
            ["done", "done", "live", "upcoming", "upcoming", "cancelled", "upcoming", "upcoming"],
            sessions.Select(s => s.GetProperty("state").GetString()));
        Assert.Equal("No class: Victoria Day week", sessions[5].GetProperty("topic").GetString());
        Assert.Equal(AdminSeries.At(new DateOnly(2026, 4, 21), 19, 30), sessions[2].GetProperty("endsAt").GetDateTimeOffset());
    }

    // L2-071 AC2: a series with no dates, no drop-in and no image.
    [Fact]
    public async Task Given_a_series_with_no_dates_When_staff_open_it_Then_it_has_no_sessions_and_no_times()
    {
        var now = factory.Time.GetUtcNow();
        var stretch = AdminSeries.NewSeries("Sunday Stretch & Prayer", now, capacity: 25, dropInPriceCents: null);
        await factory.AddSeriesAsync(stretch, []);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "joel.series.get@example.org", StaffRoleName.Moderator);

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, $"/api/admin/series/{stretch.Id}", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var series = await AdminSeries.JsonAsync(response);
        Assert.Empty(series.GetProperty("sessions").EnumerateArray());
        Assert.Equal(JsonValueKind.Null, series.GetProperty("dropInPriceCents").ValueKind);
        Assert.Equal(JsonValueKind.Null, series.GetProperty("startsAt").ValueKind);
        Assert.Equal(JsonValueKind.Null, series.GetProperty("firstStartsAt").ValueKind);
        Assert.Equal(JsonValueKind.Null, series.GetProperty("lastStartsAt").ValueKind);
        Assert.Equal(0, series.GetProperty("sessionsLeft").GetInt32());
        Assert.Equal(0, series.GetProperty("sessionsHeld").GetInt32());
        Assert.Equal(DirectoryListing.TeamListingId.ToString(), series.GetProperty("host").GetProperty("id").GetString());
    }

    [Fact]
    public async Task Given_no_such_series_When_staff_open_it_Then_it_is_404_not_found()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.none@example.org");

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, $"/api/admin/series/{Guid.NewGuid()}", cookie);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
    }

    // ADR 0080: a session's number is its position in date order, not the order the dates were added.
    [Fact]
    public async Task Given_dates_added_out_of_order_When_staff_open_the_series_Then_they_are_numbered_by_date()
    {
        var now = factory.Time.GetUtcNow();
        var series = AdminSeries.NewSeries("Out of Order Club", now);
        await factory.AddSeriesAsync(series, [new(new DateOnly(2026, 5, 6)), new(new DateOnly(2026, 4, 22)), new(new DateOnly(2026, 4, 29))]);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.order@example.org");

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, $"/api/admin/series/{series.Id}", cookie);

        var sessions = (await AdminSeries.JsonAsync(response)).GetProperty("sessions").EnumerateArray().ToList();
        Assert.Equal(
            [AdminSeries.At(new DateOnly(2026, 4, 22)), AdminSeries.At(new DateOnly(2026, 4, 29)), AdminSeries.At(new DateOnly(2026, 5, 6))],
            sessions.Select(s => s.GetProperty("startsAt").GetDateTimeOffset()));
        Assert.Equal([1, 2, 3], sessions.Select(s => s.GetProperty("number").GetInt32()));
        Assert.Equal(["live", "upcoming", "upcoming"], sessions.Select(s => s.GetProperty("state").GetString()));
    }
}
