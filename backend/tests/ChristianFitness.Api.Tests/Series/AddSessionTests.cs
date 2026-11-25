using System.Net;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-071 AC6, AC14 and AC16 (ADR 0091): Add a date makes a published session event with the
/// series' details, the drop-in price as its price, and the given Toronto date, start, end and
/// topic; it sits among the sessions in date order as upcoming and Sessions left rises by one, and
/// admin Events tags it with its series. A date not after now, an end not after the start, a missing
/// date or time and a topic over 200 characters are refused naming the field, and nothing is added.
/// It is audited as <c>series.session_added</c>; a Moderator may do it too. The clock is the mocks'
/// today, Wednesday April 15, 2026, 8:45 AM in Toronto.
/// </summary>
public sealed class AddSessionTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    private static Dictionary<string, object?> Date(string date, string start = "18:30", string end = "19:30", string? topic = "Make-up run for Victoria Day week") =>
        new(StringComparer.Ordinal) { ["date"] = date, ["startTime"] = start, ["endTime"] = end, ["topic"] = topic };

    private async Task<EventSeries> AddCouchAsync(string title)
    {
        var host = await factory.AddListingAsync(ListingKind.Organization, $"{title} Host");
        var series = AdminSeries.NewSeries(title, factory.Time.GetUtcNow(), capacity: 40, priceCents: 6400, dropInPriceCents: 1000, host: host);
        await factory.AddCouchTo5KAsync(series);
        return series;
    }

    private static Task<HttpResponseMessage> AddAsync(HttpClient client, string cookie, Guid id, object body) =>
        AdminEvents.SendAsync(client, HttpMethod.Post, $"/api/admin/series/{id}/sessions", cookie, body);

    [Fact]
    public async Task Given_Couch_to_5K_When_an_Admin_adds_June_2_Then_it_is_session_9_upcoming_and_a_published_event_with_the_series_details()
    {
        var couch = await AddCouchAsync("Couch to 5K Add");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.add@example.org");

        using var response = await AddAsync(client, cookie, couch.Id, Date("2026-06-02"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var series = await AdminSeries.JsonAsync(response);
        Assert.Equal((6, 8), (series.GetProperty("sessionsLeft").GetInt32(), series.GetProperty("sessionsHeld").GetInt32()));
        var sessions = series.GetProperty("sessions").EnumerateArray().ToList();
        Assert.Equal(9, sessions.Count);
        var added = sessions[8];
        Assert.Equal(
            (9, "Make-up run for Victoria Day week", "upcoming"),
            (added.GetProperty("number").GetInt32(), added.GetProperty("topic").GetString(), added.GetProperty("state").GetString()));
        var starts = AdminSeries.At(new DateOnly(2026, 6, 2));
        Assert.Equal(starts, added.GetProperty("startsAt").GetDateTimeOffset());
        Assert.Equal(starts.AddHours(1), added.GetProperty("endsAt").GetDateTimeOffset());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var session = await db.Events.AsNoTracking().SingleAsync(e => e.Id == Guid.Parse(added.GetProperty("id").GetString()!), TestContext.Current.CancellationToken);
        Assert.Equal(
            (couch.Id, EventStatus.Published, "Couch to 5K Add", "Humber Bay Park East", 1000, 40, couch.HostListingId),
            (session.SeriesId, session.Status, session.Title, session.Place, session.PriceCents, session.Capacity, session.HostListingId));
    }

    [Fact]
    public async Task Given_Couch_to_5K_When_a_date_between_its_sessions_is_added_Then_it_sits_in_date_order()
    {
        var couch = await AddCouchAsync("Couch to 5K Between");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.add.between@example.org");

        using var response = await AddAsync(client, cookie, couch.Id, Date("2026-04-30", "07:00", "08:00", topic: null));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var sessions = (await AdminSeries.JsonAsync(response)).GetProperty("sessions").EnumerateArray().ToList();
        var dates = sessions.Select(s => s.GetProperty("startsAt").GetDateTimeOffset()).ToList();
        Assert.Equal(dates.Order(), dates);
        Assert.Equal(5, sessions.Single(s => s.GetProperty("startsAt").GetDateTimeOffset() == AdminSeries.At(new DateOnly(2026, 4, 30), 7, 0)).GetProperty("number").GetInt32());
        Assert.Equal(JsonValueKind.Null, sessions[4].GetProperty("topic").ValueKind);
    }

    public static TheoryData<string, string, string, string, string?, string, string> Refusals() => new()
    {
        // why, date, start, end, topic, the fieldCodes key, the code expected
        { "no date", "", "18:30", "19:30", null, "date", "date_required" },
        { "a date that is not one", "2026-13-01", "18:30", "19:30", null, "date", "date_required" },
        { "no start", "2026-06-02", "", "19:30", null, "startTime", "start_time_required" },
        { "no end", "2026-06-02", "18:30", "", null, "endTime", "end_time_required" },
        { "a past date", "2026-04-10", "18:30", "19:30", null, "date", "start_in_past" },
        { "earlier today", "2026-04-15", "08:00", "09:00", null, "date", "start_in_past" },
        { "an end at the start", "2026-06-02", "18:30", "18:30", null, "endTime", "end_not_after_start" },
        { "an end before the start", "2026-06-02", "18:30", "18:00", null, "endTime", "end_not_after_start" },
        { "a topic over 200 characters", "2026-06-02", "18:30", "19:30", new string('t', 201), "topic", "topic_too_long" },
    };

    [Theory]
    [MemberData(nameof(Refusals))]
    public async Task Given_a_date_that_fails_When_it_is_added_Then_it_is_refused_naming_the_field_and_nothing_is_added(
        string why, string date, string start, string end, string? topic, string field, string code)
    {
        var couch = await AddCouchAsync($"Couch to 5K Refused {why}");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, $"dana.series.add.refused.{why.Replace(' ', '.')}@example.org");

        using var response = await AddAsync(client, cookie, couch.Id, Date(date, start, end, topic));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await AdminSeries.JsonAsync(response);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal([field], AdminSeries.Keys(problem.GetProperty("fieldCodes")));
        Assert.Equal(code, problem.GetProperty("fieldCodes").GetProperty(field).GetString());
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(8, await db.Events.CountAsync(e => e.SeriesId == couch.Id, TestContext.Current.CancellationToken));
        Assert.Equal(0, await db.AuditEntries.CountAsync(e => e.RecordId == couch.Id, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_an_Admin_When_they_add_a_date_Then_an_audit_entry_records_who_and_which_series()
    {
        var couch = await AddCouchAsync("Couch to 5K Add Audit");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.add.audit@example.org");

        using var response = await AddAsync(client, cookie, couch.Id, Date("2026-06-02"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var staffId = await db.Members.Where(m => m.NormalizedEmail == "dana.series.add.audit@example.org").Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var entry = Assert.Single(await db.AuditEntries.Where(e => e.RecordId == couch.Id).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((staffId, "series.session_added", "EventSeries"), (entry.ActorMemberId, entry.Action, entry.RecordType));
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_add_a_date_Then_it_is_added()
    {
        var couch = await AddCouchAsync("Couch to 5K Add Moderator");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "joel.series.add@example.org", StaffRoleName.Moderator);

        using var response = await AddAsync(client, cookie, couch.Id, Date("2026-06-02"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Given_no_such_series_When_a_date_is_added_Then_it_is_404_not_found()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.add.missing@example.org");

        using var response = await AddAsync(client, cookie, Guid.NewGuid(), Date("2026-06-02"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
    }

    // L2-071 AC6 (ADR 0091): a session event appears in admin Events tagged with its series.
    [Fact]
    public async Task Given_a_session_event_When_staff_list_Events_Then_it_names_its_series_and_a_standalone_event_names_none()
    {
        var couch = await AddCouchAsync("Couch to 5K Tagged");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.tagged@example.org");
        await AdminEvents.CreatedIdAsync(client, cookie, AdminEvents.Retreat());

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/events", cookie);

        var events = (await AdminSeries.JsonAsync(response)).GetProperty("events").EnumerateArray().ToList();
        var session = events.First(e => e.GetProperty("title").GetString() == "Couch to 5K Tagged");
        Assert.Equal(couch.Id.ToString(), session.GetProperty("series").GetProperty("id").GetString());
        Assert.Equal("Couch to 5K Tagged", session.GetProperty("series").GetProperty("title").GetString());
        Assert.Equal(["id", "title"], AdminSeries.Keys(session.GetProperty("series")));
        var retreat = events.First(e => e.GetProperty("title").GetString() == "Whole Life Retreat");
        Assert.Equal(JsonValueKind.Null, retreat.GetProperty("series").ValueKind);
    }
}
