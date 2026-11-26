using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-051 AC1 and AC6 (ADR 0080, ADR 0091, ADR 0096): a member opens one series and reads what its
/// page shows as data: the head, the host and whether they joined it. A series opens while one of
/// its dates is held, whatever its date; an unknown id, a series with no dates or with only
/// cancelled ones is 404 <c>series_not_found</c>.
/// </summary>
public sealed class ViewSeriesTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    private const string Email = "grace.series.view@example.org";

    [Fact]
    public async Task Given_Couch_to_5K_When_a_member_who_joined_opens_it_Then_its_head_and_host_answer_as_the_mock_draws_them()
    {
        var now = factory.Time.GetUtcNow();
        var (client, cookie) = await MemberSeries.MemberAsync(factory, Email);
        var lakeshore = await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship", verified: true);
        var couch = AdminSeries.NewSeries("Couch to 5K Run Club", now, host: lakeshore);
        await factory.AddCouchTo5KAsync(couch);
        await MemberSeries.EnrolAsync(factory, couch, Email);

        var series = await OpenAsync(client, cookie, couch.Id);

        Assert.Equal(
            [
                "id", "title", "category", "summary", "imageKey", "host", "cadence", "startsAt", "firstStartsAt", "lastStartsAt",
                "place", "area", "priceCents", "dropInPriceCents", "capacity", "spotsLeft", "sessionsLeft", "joined", "sessions",
            ],
            AdminSeries.Keys(series));
        Assert.Equal(couch.Id.ToString(), series.GetProperty("id").GetString());
        Assert.Equal("Couch to 5K Run Club", series.GetProperty("title").GetString());
        Assert.Equal("run", series.GetProperty("category").GetString());
        Assert.Equal("Eight weeks from walking to running a full 5K, together.", series.GetProperty("summary").GetString());
        Assert.Equal(JsonValueKind.Null, series.GetProperty("imageKey").ValueKind);
        var host = series.GetProperty("host");
        Assert.Equal(["id", "kind", "name", "isVerified", "photoKey"], AdminSeries.Keys(host));
        Assert.Equal(lakeshore.ToString(), host.GetProperty("id").GetString());
        Assert.Equal("organization", host.GetProperty("kind").GetString());
        Assert.Equal("Lakeshore Runners Fellowship", host.GetProperty("name").GetString());
        Assert.True(host.GetProperty("isVerified").GetBoolean());
        Assert.Equal(2, series.GetProperty("cadence").GetProperty("weekday").GetInt32());
        Assert.Equal(7, series.GetProperty("cadence").GetProperty("dates").GetInt32());
        Assert.Equal(AdminSeries.At(new DateOnly(2026, 4, 21)), series.GetProperty("startsAt").GetDateTimeOffset());
        Assert.Equal(AdminSeries.At(new DateOnly(2026, 4, 7)), series.GetProperty("firstStartsAt").GetDateTimeOffset());
        Assert.Equal(AdminSeries.At(new DateOnly(2026, 5, 26)), series.GetProperty("lastStartsAt").GetDateTimeOffset());
        Assert.Equal("Humber Bay Park East", series.GetProperty("place").GetString());
        Assert.Equal("Etobicoke, Toronto", series.GetProperty("area").GetString());
        Assert.True(series.GetProperty("joined").GetBoolean());
    }

    [Fact]
    public async Task Given_Couch_to_5K_When_a_member_opens_it_Then_every_date_answers_in_date_order_with_its_number_topic_state_and_whether_they_hold_a_place()
    {
        var now = factory.Time.GetUtcNow();
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "kai.series.view@example.org");
        var couch = AdminSeries.NewSeries("Couch to 5K Sessions", now);
        var ids = await factory.AddCouchTo5KAsync(couch);
        // The member came to the first date and holds a place at the fourth; another member holds the second.
        var memberId = await MemberSeries.MemberIdAsync(factory, "kai.series.view@example.org");
        await factory.AddRegistrationsAsync([(ids[0], memberId), (ids[3], memberId), (ids[1], Guid.NewGuid())]);

        var series = await OpenAsync(client, cookie, couch.Id);

        var sessions = series.GetProperty("sessions").EnumerateArray().ToList();
        Assert.Equal(["id", "number", "startsAt", "endsAt", "topic", "state", "held", "full", "attended"], AdminSeries.Keys(sessions[0]));
        Assert.Equal(ids.Select(id => id.ToString()), sessions.Select(s => s.GetProperty("id").GetString()));
        Assert.Equal([1, 2, 3, 4, 5, 6, 7, 8], sessions.Select(s => s.GetProperty("number").GetInt32()));
        Assert.Equal(AdminSeries.At(new DateOnly(2026, 4, 7)), sessions[0].GetProperty("startsAt").GetDateTimeOffset());
        // Each date's end, for the calendar file "All dates" writes (L2-052 AC3; ADR 0101).
        Assert.Equal(AdminSeries.At(new DateOnly(2026, 4, 7)).AddMinutes(60), sessions[0].GetProperty("endsAt").GetDateTimeOffset());
        Assert.Equal("No class: Victoria Day week", sessions[5].GetProperty("topic").GetString());
        // Today is April 15: two done, April 21 next, May 12 cancelled (ADR 0091).
        Assert.Equal(
            ["done", "done", "live", "upcoming", "upcoming", "cancelled", "upcoming", "upcoming"],
            sessions.Select(s => s.GetProperty("state").GetString()));
        Assert.Equal([true, false, false, true, false, false, false, false], sessions.Select(s => s.GetProperty("held").GetBoolean()));
        // Nothing is recorded yet, so no date reads as came or missed (L2-080 AC7; ADR 0106).
        Assert.All(sessions, s => Assert.Equal(JsonValueKind.Null, s.GetProperty("attended").ValueKind));
    }

    [Fact]
    public async Task Given_places_held_at_sessions_When_a_member_opens_the_series_Then_spots_left_are_the_fewest_left_among_sessions_to_come()
    {
        var now = factory.Time.GetUtcNow();
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "mae.series.view@example.org");
        var couch = AdminSeries.NewSeries("Couch to 5K Places", now, capacity: 40, priceCents: 6400, dropInPriceCents: 1000);
        var ids = await factory.AddCouchTo5KAsync(couch);
        // Ten held the past April 14, five the cancelled May 12 (neither counts); three hold April 28, one April 21.
        await factory.AddRegistrationsAsync([
            .. Enumerable.Range(0, 10).Select(_ => (ids[1], Guid.NewGuid())),
            .. Enumerable.Range(0, 5).Select(_ => (ids[5], Guid.NewGuid())),
            .. Enumerable.Range(0, 3).Select(_ => (ids[3], Guid.NewGuid())),
            (ids[2], Guid.NewGuid()),
        ]);

        var series = await OpenAsync(client, cookie, couch.Id);

        Assert.Equal(6400, series.GetProperty("priceCents").GetInt32());
        Assert.Equal(1000, series.GetProperty("dropInPriceCents").GetInt32());
        Assert.Equal(40, series.GetProperty("capacity").GetInt32());
        Assert.Equal(37, series.GetProperty("spotsLeft").GetInt32());
        // April 21, 28, May 5, 19 and 26 are to come; May 12 is cancelled.
        Assert.Equal(5, series.GetProperty("sessionsLeft").GetInt32());
    }

    [Fact]
    public async Task Given_sessions_whose_places_are_all_taken_When_a_member_opens_the_series_Then_only_those_still_to_come_and_not_cancelled_are_full()
    {
        var now = factory.Time.GetUtcNow();
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "rio.series.view@example.org");
        var couch = AdminSeries.NewSeries("Couch to 5K Full Dates", now, capacity: 4);
        var ids = await factory.AddCouchTo5KAsync(couch);
        // Four of four hold the past April 14, the cancelled May 12 and April 28; three of four hold May 5 (L2-053 AC7; ADR 0102).
        await factory.AddRegistrationsAsync([
            .. Enumerable.Range(0, 4).Select(_ => (ids[1], Guid.NewGuid())),
            .. Enumerable.Range(0, 4).Select(_ => (ids[5], Guid.NewGuid())),
            .. Enumerable.Range(0, 4).Select(_ => (ids[3], Guid.NewGuid())),
            .. Enumerable.Range(0, 3).Select(_ => (ids[4], Guid.NewGuid())),
        ]);

        var series = await OpenAsync(client, cookie, couch.Id);

        Assert.Equal(
            [false, false, false, true, false, false, false, false],
            series.GetProperty("sessions").EnumerateArray().Select(s => s.GetProperty("full").GetBoolean()));
    }

    [Fact]
    public async Task Given_a_finished_series_with_no_drop_in_When_a_member_opens_it_Then_it_has_no_spots_left_none_to_come_and_no_drop_in_price()
    {
        var now = factory.Time.GetUtcNow();
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "noor.series.view@example.org");
        var series = AdminSeries.NewSeries("Finished Hoops", now, dropInPriceCents: null);
        await factory.AddSeriesAsync(series, [new(new DateOnly(2026, 3, 5)), new(new DateOnly(2026, 3, 12))]);

        var answer = await OpenAsync(client, cookie, series.Id);

        Assert.Equal(JsonValueKind.Null, answer.GetProperty("spotsLeft").ValueKind);
        Assert.Equal(0, answer.GetProperty("sessionsLeft").GetInt32());
        Assert.Equal(JsonValueKind.Null, answer.GetProperty("dropInPriceCents").ValueKind);
    }

    [Fact]
    public async Task Given_dates_added_out_of_order_When_a_member_opens_the_series_Then_they_are_numbered_by_date_with_cancelled_ones_counted()
    {
        var now = factory.Time.GetUtcNow();
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "lee.series.view@example.org");
        var series = AdminSeries.NewSeries("Out of Order", now);
        await factory.AddSeriesAsync(
            series,
            [new(new DateOnly(2026, 5, 5), "Third"), new(new DateOnly(2026, 4, 21), "First", Cancelled: true), new(new DateOnly(2026, 4, 28), "Second")]);

        var answer = await OpenAsync(client, cookie, series.Id);

        var sessions = answer.GetProperty("sessions").EnumerateArray().ToList();
        Assert.Equal(["First", "Second", "Third"], sessions.Select(s => s.GetProperty("topic").GetString()));
        Assert.Equal([1, 2, 3], sessions.Select(s => s.GetProperty("number").GetInt32()));
        Assert.Equal(["cancelled", "live", "upcoming"], sessions.Select(s => s.GetProperty("state").GetString()));
    }

    [Fact]
    public async Task Given_a_series_the_member_has_not_joined_When_they_open_it_Then_joined_is_false()
    {
        var now = factory.Time.GetUtcNow();
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "hana.series.view@example.org");
        var series = AdminSeries.NewSeries("Saturday Park Bootcamp", now);
        await factory.AddSeriesAsync(series, [new(new DateOnly(2026, 4, 25))], joined: 3);

        var answer = await OpenAsync(client, cookie, series.Id);

        Assert.False(answer.GetProperty("joined").GetBoolean());
    }

    [Fact]
    public async Task Given_a_finished_series_When_a_member_opens_it_Then_it_opens_with_its_last_held_date_as_its_time()
    {
        var now = factory.Time.GetUtcNow();
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "ivy.series.view@example.org");
        var winter = AdminSeries.NewSeries("Winter Hoops", now);
        await factory.AddSeriesAsync(winter, [new(new DateOnly(2026, 2, 5)), new(new DateOnly(2026, 2, 12)), new(new DateOnly(2026, 2, 19), Cancelled: true)]);

        var answer = await OpenAsync(client, cookie, winter.Id);

        Assert.Equal(AdminSeries.At(new DateOnly(2026, 2, 12)), answer.GetProperty("startsAt").GetDateTimeOffset());
    }

    public static TheoryData<string> Unopened() => ["unknown", "no dates", "only cancelled dates"];

    [Theory]
    [MemberData(nameof(Unopened))]
    public async Task Given_a_series_with_no_held_date_or_none_at_all_When_a_member_opens_it_Then_it_is_404_series_not_found(string row)
    {
        var now = factory.Time.GetUtcNow();
        var (client, cookie) = await MemberSeries.MemberAsync(factory, $"june.{row.Replace(' ', '-')}.series.view@example.org");
        var id = Guid.CreateVersion7();
        if (row != "unknown")
        {
            var series = AdminSeries.NewSeries($"Series with {row}", now);
            await factory.AddSeriesAsync(series, row == "no dates" ? [] : [new(new DateOnly(2026, 4, 22), Cancelled: true), new(new DateOnly(2026, 4, 1), Cancelled: true)]);
            id = series.Id;
        }

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{MemberSeries.Path}/{id}", cookie);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("series_not_found", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_visitor_When_they_open_a_series_Then_they_are_refused_401()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{MemberSeries.Path}/{Guid.CreateVersion7()}", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static async Task<JsonElement> OpenAsync(HttpClient client, string cookie, Guid id)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{MemberSeries.Path}/{id}", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }
}
