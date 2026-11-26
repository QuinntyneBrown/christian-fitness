using System.Net;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-071 AC4, AC9 (ADR 0103): staff cancel a series date that has not started. The session is
/// cancelled with its places kept, Sessions left falls by one, the answer says how many hold a
/// place there (those told), and an audit entry records who, which series and which session. A
/// started date is refused <c>session_started</c>, one already cancelled <c>event_not_published</c>,
/// and a session not of the series <c>not_found</c>, each changing nothing. A Moderator may cancel
/// too. Today is April 15, 2026: Couch to 5K's April 7 and 14 are past and May 12 is cancelled.
/// </summary>
public sealed class CancelSessionTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    /// <summary>May 5, the fifth date: upcoming.</summary>
    private const int May5 = 4;

    internal static Task<HttpResponseMessage> CancelAsync(HttpClient client, string cookie, Guid seriesId, Guid sessionId) =>
        AdminEvents.SendAsync(client, HttpMethod.Post, $"/api/admin/series/{seriesId}/sessions/{sessionId}/cancel", cookie);

    /// <summary>
    /// Couch to 5K with two members who joined and hold May 5, one who dropped in on May 5 only, and
    /// one who joined but holds only May 19; answers the series, its session ids and the members.
    /// </summary>
    internal static async Task<(EventSeries Series, IReadOnlyList<Guid> Sessions, Guid[] Holders, Guid Other)> CouchWithPlacesAsync(AdminSeriesFactory factory, string title)
    {
        var series = AdminSeries.NewSeries(title, factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        var tag = Guid.NewGuid().ToString("N")[..12];
        var joinedA = await MemberAsync(factory, $"ada.{tag}@example.org");
        var joinedB = await MemberAsync(factory, $"ben.{tag}@example.org");
        var droppedIn = await MemberAsync(factory, $"cy.{tag}@example.org");
        var other = await MemberAsync(factory, $"dee.{tag}@example.org");
        await MemberSeries.EnrolAsync(factory, series, $"ada.{tag}@example.org");
        await MemberSeries.EnrolAsync(factory, series, $"ben.{tag}@example.org");
        await MemberSeries.EnrolAsync(factory, series, $"dee.{tag}@example.org");
        await factory.AddRegistrationsAsync([(sessions[May5], joinedA), (sessions[May5], joinedB), (sessions[May5], droppedIn), (sessions[6], other)]);
        return (series, sessions, [joinedA, joinedB, droppedIn], other);
    }

    private static async Task<Guid> MemberAsync(AdminSeriesFactory factory, string email)
    {
        var (client, _) = await MemberSeries.MemberAsync(factory, email);
        client.Dispose();
        return await MemberSeries.MemberIdAsync(factory, email);
    }

    [Fact]
    public async Task Given_May_5_with_three_holding_a_place_When_an_Admin_cancels_it_Then_it_is_cancelled_three_are_told_and_Sessions_left_falls_by_one()
    {
        var (series, sessions, _, _) = await CouchWithPlacesAsync(factory, "Couch Cancel");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.cancel@example.org");

        using var response = await CancelAsync(client, cookie, series.Id, sessions[May5]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await AdminSeries.JsonAsync(response);
        Assert.Equal(["series", "told"], AdminSeries.Keys(answer));
        Assert.Equal(3, answer.GetProperty("told").GetInt32());
        var shown = answer.GetProperty("series");
        Assert.Equal(series.Id, shown.GetProperty("id").GetGuid());
        // April 21, 28, May 19 and 26 are left; May 5 and 12 are cancelled.
        Assert.Equal((4, 6), (shown.GetProperty("sessionsLeft").GetInt32(), shown.GetProperty("sessionsHeld").GetInt32()));
        Assert.Equal(
            ["done", "done", "live", "upcoming", "cancelled", "cancelled", "upcoming", "upcoming"],
            shown.GetProperty("sessions").EnumerateArray().Select(s => s.GetProperty("state").GetString()));

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var session = await db.Events.AsNoTracking().SingleAsync(e => e.Id == sessions[May5], TestContext.Current.CancellationToken);
        Assert.Equal(EventStatus.Cancelled, session.Status);
        // The places are kept, so a Restore gives them back (ADR 0035, ADR 0103).
        Assert.Equal(3, await db.Registrations.CountAsync(r => r.EventId == sessions[May5], TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_May_5_held_by_two_who_joined_and_one_who_dropped_in_When_staff_open_the_series_Then_each_session_says_how_many_are_going_and_whether_it_started()
    {
        var (series, _, _, _) = await CouchWithPlacesAsync(factory, "Couch Going");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.going@example.org");

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, $"/api/admin/series/{series.Id}", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var sessions = (await AdminSeries.JsonAsync(response)).GetProperty("sessions").EnumerateArray().ToList();
        Assert.Equal(
            ["id", "number", "startsAt", "endsAt", "topic", "state", "started", "joinedGoing", "droppedInGoing"],
            AdminSeries.Keys(sessions[0]));
        Assert.Equal([true, true, false, false, false, false, false, false], sessions.Select(s => s.GetProperty("started").GetBoolean()));
        Assert.Equal([0, 0, 0, 0, 2, 0, 1, 0], sessions.Select(s => s.GetProperty("joinedGoing").GetInt32()));
        Assert.Equal([0, 0, 0, 0, 1, 0, 0, 0], sessions.Select(s => s.GetProperty("droppedInGoing").GetInt32()));
    }

    [Fact]
    public async Task Given_an_Admin_When_they_cancel_a_date_Then_an_audit_entry_records_who_which_series_and_which_session()
    {
        var (series, sessions, _, _) = await CouchWithPlacesAsync(factory, "Couch Cancel Audit");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.cancel.audit@example.org");

        using var response = await CancelAsync(client, cookie, series.Id, sessions[May5]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var staffId = await db.Members.Where(m => m.NormalizedEmail == "dana.series.cancel.audit@example.org").Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var entry = Assert.Single(await db.AuditEntries.Where(e => e.RecordId == sessions[May5]).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((staffId, "series.session_cancelled", "Event"), (entry.ActorMemberId, entry.Action, entry.RecordType));
        // The session names its series, so the one entry says which series too.
        Assert.Equal(series.Id, (await db.Events.AsNoTracking().SingleAsync(e => e.Id == entry.RecordId, TestContext.Current.CancellationToken)).SeriesId);
    }

    public static TheoryData<string, int, HttpStatusCode, string> Refusals() => new()
    {
        // why, which session (-1: one of another series), the status and the code expected
        { "April 14 has started", 1, HttpStatusCode.Conflict, "session_started" },
        { "May 12 is already cancelled", 5, HttpStatusCode.Conflict, "event_not_published" },
        { "the session is another series'", -1, HttpStatusCode.NotFound, "not_found" },
    };

    [Theory]
    [MemberData(nameof(Refusals))]
    public async Task Given_a_date_that_cannot_be_cancelled_When_staff_cancel_it_Then_it_is_refused_and_nothing_changes(string why, int index, HttpStatusCode status, string code)
    {
        var series = AdminSeries.NewSeries($"Couch Cancel Refused {why}", factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        var elsewhere = await factory.AddCouchTo5KAsync(AdminSeries.NewSeries($"Elsewhere {why}", factory.Time.GetUtcNow()));
        var sessionId = index < 0 ? elsewhere[May5] : sessions[index];
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, $"dana.series.cancel.refused.{index + 1}@example.org");
        EventStatus before;
        using (var scope = factory.Services.CreateScope())
        {
            before = (await scope.ServiceProvider.GetRequiredService<AppDbContext>().Events.AsNoTracking().SingleAsync(e => e.Id == sessionId, TestContext.Current.CancellationToken)).Status;
        }

        using var response = await CancelAsync(client, cookie, series.Id, sessionId);

        Assert.Equal(status, response.StatusCode);
        Assert.Equal(code, (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
        using var after = factory.Services.CreateScope();
        var db = after.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(before, (await db.Events.AsNoTracking().SingleAsync(e => e.Id == sessionId, TestContext.Current.CancellationToken)).Status);
        Assert.Equal(0, await db.AuditEntries.CountAsync(e => e.RecordId == sessionId, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_an_unknown_series_When_staff_cancel_a_date_of_it_Then_it_is_not_found()
    {
        var sessions = await factory.AddCouchTo5KAsync(AdminSeries.NewSeries("Couch Cancel Unknown", factory.Time.GetUtcNow()));
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.cancel.unknown@example.org");

        using var response = await CancelAsync(client, cookie, Guid.NewGuid(), sessions[May5]);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_cancel_a_date_Then_it_is_cancelled()
    {
        var (series, sessions, _, _) = await CouchWithPlacesAsync(factory, "Couch Cancel Moderator");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "mo.series.cancel@example.org", StaffRoleName.Moderator);

        using var response = await CancelAsync(client, cookie, series.Id, sessions[May5]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
