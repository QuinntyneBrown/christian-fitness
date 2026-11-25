using System.Net;
using System.Text.Json;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-050 AC1 and AC5 (ADR 0080, ADR 0091, ADR 0093): a member lists the series with a published
/// session still to come by their next session, each with what its row shows as data; a series
/// whose every date is past or cancelled, or that has none, is not listed. The class has its store
/// to itself, so the list is exactly these series.
/// </summary>
public sealed class BrowseSeriesTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    private const string Email = "grace.series.browse@example.org";

    [Fact]
    public async Task Given_listed_and_unlisted_series_When_a_member_lists_them_Then_the_listed_come_by_next_session_with_their_facts()
    {
        var now = factory.Time.GetUtcNow();
        var (client, cookie) = await MemberSeries.MemberAsync(factory, Email);
        var lakeshore = await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");
        // Couch to 5K: eight Tuesdays from April 7, May 12 cancelled; the member joined. Next April 21.
        var couch = AdminSeries.NewSeries("Couch to 5K Run Club", now, host: lakeshore);
        await factory.AddCouchTo5KAsync(couch);
        await MemberSeries.EnrolAsync(factory, couch, Email);
        // Bootcamp: eight Saturdays from March 28, $64 for all, joined by others. Next April 18, so it comes first.
        var bootcamp = AdminSeries.NewSeries("Saturday Park Bootcamp", now, priceCents: 6400, dropInPriceCents: 1000, category: EventCategory.Workout, area: "Waterfront");
        await factory.AddSeriesAsync(bootcamp, [.. Enumerable.Range(0, 8).Select(week => new SessionSeed(new DateOnly(2026, 3, 28).AddDays(7 * week), StartHour: 8, StartMinute: 0))], joined: 3);
        // Hoops: six last Thursdays, three past. Next April 30, so it comes last.
        var hoops = AdminSeries.NewSeries("Women's Hoops & Devotion", now, category: EventCategory.Basketball, area: "Downtown");
        await factory.AddSeriesAsync(
            hoops,
            [.. Enumerable.Range(1, 6).Select(month => new SessionSeed(LastThursdayOf(month), StartHour: 19, StartMinute: 0))]);
        // Not listed: every date past; every date to come cancelled; no dates at all.
        await factory.AddSeriesAsync(AdminSeries.NewSeries("Winter Hoops", now), [new(new DateOnly(2026, 2, 5))]);
        await factory.AddSeriesAsync(AdminSeries.NewSeries("Called Off", now), [new(new DateOnly(2026, 4, 1)), new(new DateOnly(2026, 4, 22), Cancelled: true)]);
        await factory.AddSeriesAsync(AdminSeries.NewSeries("No Dates Yet", now), []);

        var list = await MemberSeries.ListAsync(client, cookie);

        Assert.Equal(["series"], AdminSeries.Keys(list));
        Assert.Equal(["Saturday Park Bootcamp", "Couch to 5K Run Club", "Women's Hoops & Devotion"], MemberSeries.TitlesOf(list));
        var rows = list.GetProperty("series").EnumerateArray().ToList();
        Assert.Equal(
            ["id", "title", "category", "imageKey", "host", "area", "cadence", "startsAt", "firstStartsAt", "lastStartsAt", "sessions", "priceCents", "joined"],
            AdminSeries.Keys(rows[1]));

        var row = rows[1];
        Assert.Equal(couch.Id.ToString(), row.GetProperty("id").GetString());
        Assert.Equal("run", row.GetProperty("category").GetString());
        Assert.Equal(JsonValueKind.Null, row.GetProperty("imageKey").ValueKind);
        Assert.Equal("Lakeshore Runners Fellowship", row.GetProperty("host").GetProperty("name").GetString());
        Assert.Equal(lakeshore.ToString(), row.GetProperty("host").GetProperty("id").GetString());
        Assert.Equal("Etobicoke, Toronto", row.GetProperty("area").GetString());
        Assert.Equal(2, row.GetProperty("cadence").GetProperty("weekday").GetInt32());
        Assert.Equal(7, row.GetProperty("cadence").GetProperty("dates").GetInt32());
        Assert.Equal(AdminSeries.At(new DateOnly(2026, 4, 21)), row.GetProperty("startsAt").GetDateTimeOffset());
        Assert.Equal(AdminSeries.At(new DateOnly(2026, 4, 7)), row.GetProperty("firstStartsAt").GetDateTimeOffset());
        Assert.Equal(AdminSeries.At(new DateOnly(2026, 5, 26)), row.GetProperty("lastStartsAt").GetDateTimeOffset());
        Assert.Equal(
            ["done", "done", "live", "upcoming", "upcoming", "cancelled", "upcoming", "upcoming"],
            row.GetProperty("sessions").EnumerateArray().Select(s => s.GetString()));
        Assert.Equal(0, row.GetProperty("priceCents").GetInt32());
        Assert.True(row.GetProperty("joined").GetBoolean());

        var paid = rows[0];
        Assert.Equal(6400, paid.GetProperty("priceCents").GetInt32());
        Assert.False(paid.GetProperty("joined").GetBoolean());
        Assert.Equal(AdminSeries.At(new DateOnly(2026, 4, 18), 8, 0), paid.GetProperty("startsAt").GetDateTimeOffset());

        var monthly = rows[2];
        Assert.Equal(JsonValueKind.Null, monthly.GetProperty("cadence").GetProperty("weekday").ValueKind);
        Assert.Equal(6, monthly.GetProperty("cadence").GetProperty("dates").GetInt32());
        Assert.Equal(["done", "done", "done", "live", "upcoming", "upcoming"], monthly.GetProperty("sessions").EnumerateArray().Select(s => s.GetString()));
    }

    [Fact]
    public async Task Given_a_visitor_When_they_list_series_Then_they_are_refused_401()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, MemberSeries.Path, null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static DateOnly LastThursdayOf(int month)
    {
        var last = new DateOnly(2026, month, DateTime.DaysInMonth(2026, month));
        return last.AddDays(-(((int)last.DayOfWeek - (int)DayOfWeek.Thursday + 7) % 7));
    }
}
