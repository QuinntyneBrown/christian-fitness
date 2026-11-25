using System.Net;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-071 AC1 (ADR 0080, ADR 0091): Event series lists every series by its next session's start,
/// series with no session left last, then by title, each with its title, cadence (as numbers),
/// time and how many joined of its capacity. The class has its store to itself, so the order is
/// the order of exactly these series.
/// </summary>
public sealed class ListSeriesTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    [Fact]
    public async Task Given_series_with_and_without_sessions_left_When_staff_list_them_Then_they_come_by_next_session_with_their_facts()
    {
        var now = factory.Time.GetUtcNow();
        var couch = AdminSeries.NewSeries("Couch to 5K Run Club", now, capacity: 40);
        await factory.AddCouchTo5KAsync(couch);
        // Saturdays from April 4: its next session (April 18) comes before Couch to 5K's (April 21).
        var bootcamp = AdminSeries.NewSeries("Saturday Park Bootcamp", now, capacity: 50, category: Domain.Events.EventCategory.Workout);
        await factory.AddSeriesAsync(
            bootcamp,
            [
                new(new DateOnly(2026, 4, 4), StartHour: 8, StartMinute: 0),
                new(new DateOnly(2026, 4, 11), StartHour: 8, StartMinute: 0),
                new(new DateOnly(2026, 4, 18), StartHour: 8, StartMinute: 0),
                // A cancelled date does not break the weekly cadence, nor count as next.
                new(new DateOnly(2026, 4, 16), Cancelled: true, StartHour: 8, StartMinute: 0),
            ],
            joined: 38);
        // Dates that are not a week apart: "<n> dates"; all past, so it lists after the ones with dates left.
        var hoops = AdminSeries.NewSeries("Women's Hoops & Devotion", now, capacity: 30, category: Domain.Events.EventCategory.Basketball);
        await factory.AddSeriesAsync(
            hoops,
            [new(new DateOnly(2026, 1, 29), StartHour: 19, StartMinute: 0), new(new DateOnly(2026, 2, 26), StartHour: 19, StartMinute: 0)],
            joined: 24);
        // No dates at all: last with the others that have none left, by title.
        var stretch = AdminSeries.NewSeries("Sunday Stretch & Prayer", now, capacity: 25, category: Domain.Events.EventCategory.Mobility);
        await factory.AddSeriesAsync(stretch, []);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.list@example.org");

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/series", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await AdminSeries.JsonAsync(response);
        Assert.Equal(["series"], AdminSeries.Keys(answer));
        var rows = answer.GetProperty("series").EnumerateArray().ToList();
        Assert.Equal(
            ["Saturday Park Bootcamp", "Couch to 5K Run Club", "Sunday Stretch & Prayer", "Women's Hoops & Devotion"],
            rows.Select(r => r.GetProperty("title").GetString()));
        Assert.Equal(["id", "title", "cadence", "startsAt", "joined", "capacity"], AdminSeries.Keys(rows[1]));
        Assert.Equal(couch.Id.ToString(), rows[1].GetProperty("id").GetString());

        // Couch to 5K: every held Tuesday a week after the last (the cancelled May 12 left out), 7 held.
        AssertCadence(rows[1], weekday: 2, dates: 7);
        Assert.Equal(AdminSeries.At(new DateOnly(2026, 4, 21)), rows[1].GetProperty("startsAt").GetDateTimeOffset());
        Assert.Equal(31, rows[1].GetProperty("joined").GetInt32());
        Assert.Equal(40, rows[1].GetProperty("capacity").GetInt32());

        AssertCadence(rows[0], weekday: 6, dates: 3);
        Assert.Equal(AdminSeries.At(new DateOnly(2026, 4, 18), 8, 0), rows[0].GetProperty("startsAt").GetDateTimeOffset());
        Assert.Equal(38, rows[0].GetProperty("joined").GetInt32());

        // No dates: no cadence weekday, no time.
        AssertCadence(rows[2], weekday: null, dates: 0);
        Assert.Equal(JsonValueKind.Null, rows[2].GetProperty("startsAt").ValueKind);
        Assert.Equal(0, rows[2].GetProperty("joined").GetInt32());

        // Nothing left: the time is the last held session's.
        AssertCadence(rows[3], weekday: null, dates: 2);
        Assert.Equal(AdminSeries.At(new DateOnly(2026, 2, 26), 19, 0), rows[3].GetProperty("startsAt").GetDateTimeOffset());
    }

    // L2-071 AC8 (ADR 0064): a Moderator opens and uses Event series as an Admin does.
    [Fact]
    public async Task Given_a_Moderator_When_they_list_series_Then_it_is_answered()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "joel.series.list@example.org", StaffRoleName.Moderator);

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/series", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_member_who_is_not_staff_When_they_list_series_Then_it_is_refused()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "ruth.series.member@example.org", role: null);
        using var signedIn = await Browser.SignInAsync(client, "ruth.series.member@example.org", Staff.Password);

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/series", Browser.SessionCookie(signedIn));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static void AssertCadence(JsonElement row, int? weekday, int dates)
    {
        var cadence = row.GetProperty("cadence");
        Assert.Equal(["weekday", "dates"], AdminSeries.Keys(cadence));
        if (weekday is null)
        {
            Assert.Equal(JsonValueKind.Null, cadence.GetProperty("weekday").ValueKind);
        }
        else
        {
            Assert.Equal(weekday, cadence.GetProperty("weekday").GetInt32());
        }

        Assert.Equal(dates, cadence.GetProperty("dates").GetInt32());
    }
}
