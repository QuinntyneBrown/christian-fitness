using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Events;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-053 AC2 (ADR 0102): a member registers for the dates they ticked, each as L2-011 states for
/// an event (capacity, a paid date reserved, a suspended member refused), all of them or none, and
/// joins the series' chat; a date that filled meanwhile is named in the refusal. Today is April 15,
/// 2026: Couch to 5K's April 21, 28, May 5, 19 and 26 are to come, May 12 is cancelled, April 7 and
/// 14 are past.
/// </summary>
public sealed class DropInDatesTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    /// <summary>Sends the whole set of dates to come the member wants to hold.</summary>
    internal static async Task<HttpResponseMessage> SetDropInsAsync(HttpClient client, string cookie, Guid seriesId, params Guid[] sessionIds)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, new Uri($"{MemberSeries.Path}/{seriesId}/drop-ins", UriKind.Relative))
        {
            Content = JsonContent.Create(new { sessionIds }),
        };
        request.Headers.Add("Cookie", cookie);
        return await client.SendAsync(request, TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Given_a_paid_drop_in_When_a_member_registers_for_two_dates_Then_they_hold_both_reserved_each_going_rises_by_one_and_they_have_not_joined()
    {
        var series = AdminSeries.NewSeries("Drop In Two Dates", factory.Time.GetUtcNow(), priceCents: 6400, dropInPriceCents: 1000);
        var sessions = await factory.AddCouchTo5KAsync(series);
        var before = await GoingAsync(sessions);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "grace.series.dropin@example.org");
        var graceId = await MemberSeries.MemberIdAsync(factory, "grace.series.dropin@example.org");

        using var response = await SetDropInsAsync(client, cookie, series.Id, sessions[3], sessions[6]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await AdminSeries.JsonAsync(response);
        Assert.Equal(series.Id, answer.GetProperty("id").GetGuid());
        Assert.False(answer.GetProperty("joined").GetBoolean());
        Assert.Equal(
            [false, false, false, true, false, false, true, false],
            answer.GetProperty("sessions").EnumerateArray().Select(s => s.GetProperty("held").GetBoolean()));
        var after = await GoingAsync(sessions);
        Assert.Equal([0, 0, 0, 1, 0, 0, 1, 0], sessions.Select(id => after[id] - before[id]));
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var places = await db.Registrations.Where(r => r.MemberId == graceId).ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(new[] { sessions[3], sessions[6] }.Order(), places.Select(r => r.EventId).Order());
        Assert.All(places, r => Assert.Equal(RegistrationStatus.Reserved, r.Status));
        Assert.False(await db.SeriesEnrolments.AnyAsync(e => e.MemberId == graceId, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_a_free_drop_in_When_a_member_registers_for_a_date_Then_the_place_is_confirmed()
    {
        var series = AdminSeries.NewSeries("Drop In Free Date", factory.Time.GetUtcNow(), priceCents: 6400, dropInPriceCents: 0);
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "hope.series.dropin@example.org");
        var hopeId = await MemberSeries.MemberIdAsync(factory, "hope.series.dropin@example.org");

        using var response = await SetDropInsAsync(client, cookie, series.Id, sessions[2]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var place = await db.Registrations.SingleAsync(r => r.MemberId == hopeId, TestContext.Current.CancellationToken);
        Assert.Equal((sessions[2], RegistrationStatus.Confirmed), (place.EventId, place.Status));
    }

    [Fact]
    public async Task Given_a_member_who_holds_no_date_When_they_drop_in_Then_they_are_in_the_series_chat()
    {
        var series = AdminSeries.NewSeries("Drop In Chat", factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "kai.series.dropin@example.org");
        await using var hub = await SeriesHub.ConnectAsync(factory, cookie);
        Assert.Equal("not_a_participant", (await hub.JoinAsync(series.Id)).Code);

        using var response = await SetDropInsAsync(client, cookie, series.Id, sessions[4]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Null((await hub.JoinAsync(series.Id)).Code);
    }

    [Fact]
    public async Task Given_a_ticked_date_that_filled_meanwhile_When_a_member_registers_Then_it_is_refused_event_full_naming_that_session_and_nothing_is_held()
    {
        var series = AdminSeries.NewSeries("Drop In Filled", factory.Time.GetUtcNow(), capacity: 3);
        var sessions = await factory.AddCouchTo5KAsync(series);
        // May 19 (session 7) is full; May 26 (session 8) has one place left; April 28 (session 4) has places.
        await factory.AddRegistrationsAsync([
            .. Enumerable.Range(0, 3).Select(_ => (sessions[6], Guid.NewGuid())),
            .. Enumerable.Range(0, 2).Select(_ => (sessions[7], Guid.NewGuid())),
        ]);
        var before = await GoingAsync(sessions);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "mae.series.dropin@example.org");
        var maeId = await MemberSeries.MemberIdAsync(factory, "mae.series.dropin@example.org");

        using var response = await SetDropInsAsync(client, cookie, series.Id, sessions[3], sessions[6], sessions[7]);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await AdminSeries.JsonAsync(response);
        Assert.Equal("event_full", problem.GetProperty("code").GetString());
        Assert.Equal([7], problem.GetProperty("sessions").EnumerateArray().Select(n => n.GetInt32()));
        Assert.Equal(before, await GoingAsync(sessions));
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await db.Registrations.AnyAsync(r => r.MemberId == maeId, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_two_ticked_dates_that_filled_When_a_member_registers_Then_the_refusal_names_both_in_date_order()
    {
        var series = AdminSeries.NewSeries("Drop In Two Filled", factory.Time.GetUtcNow(), capacity: 2);
        var sessions = await factory.AddCouchTo5KAsync(series);
        await factory.AddRegistrationsAsync([
            .. Enumerable.Range(0, 2).Select(_ => (sessions[7], Guid.NewGuid())),
            .. Enumerable.Range(0, 2).Select(_ => (sessions[2], Guid.NewGuid())),
        ]);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "lee.series.dropin@example.org");

        using var response = await SetDropInsAsync(client, cookie, series.Id, sessions[7], sessions[4], sessions[2]);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal([3, 8], (await AdminSeries.JsonAsync(response)).GetProperty("sessions").EnumerateArray().Select(n => n.GetInt32()));
    }

    [Fact]
    public async Task Given_a_suspended_member_When_they_register_for_a_date_Then_it_is_refused_account_suspended_and_nothing_is_held()
    {
        var series = AdminSeries.NewSeries("Drop In Suspended", factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "suspended.series.dropin@example.org");
        var memberId = await MemberSeries.MemberIdAsync(factory, "suspended.series.dropin@example.org");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var member = await db.Members.SingleAsync(m => m.Id == memberId, TestContext.Current.CancellationToken);
            Assert.True(member.TrySuspend("Repeated harassment"));
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        using var response = await SetDropInsAsync(client, cookie, series.Id, sessions[3]);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("account_suspended", (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
        using var check = factory.Services.CreateScope();
        Assert.False(await check.ServiceProvider.GetRequiredService<AppDbContext>().Registrations.AnyAsync(r => r.MemberId == memberId, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_a_series_that_does_not_exist_When_a_member_registers_for_dates_Then_it_is_series_not_found()
    {
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "nowhere.series.dropin@example.org");

        using var response = await SetDropInsAsync(client, cookie, Guid.CreateVersion7(), Guid.CreateVersion7());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("series_not_found", (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
    }

    /// <summary>Each set that is not one a page can send, by the session it names (ADR 0102).</summary>
    public static TheoryData<string> InvalidSets => ["repeated", "past", "cancelled", "unknown", "other series"];

    [Theory]
    [MemberData(nameof(InvalidSets))]
    public async Task Given_a_set_that_names_a_date_no_one_can_drop_in_on_When_a_member_sends_it_Then_it_is_refused_sessions_invalid_and_nothing_is_held(string row)
    {
        var series = AdminSeries.NewSeries($"Drop In Invalid {row}", factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        var other = AdminSeries.NewSeries($"Other Series {row}", factory.Time.GetUtcNow());
        var otherSessions = await factory.AddCouchTo5KAsync(other);
        var email = $"{row.Replace(' ', '-')}.series.dropin@example.org";
        var (client, cookie) = await MemberSeries.MemberAsync(factory, email);
        var memberId = await MemberSeries.MemberIdAsync(factory, email);
        Guid[] set = row switch
        {
            "repeated" => [sessions[3], sessions[3]],
            "past" => [sessions[3], sessions[1]],
            "cancelled" => [sessions[3], sessions[5]],
            "unknown" => [sessions[3], Guid.CreateVersion7()],
            _ => [sessions[3], otherSessions[3]],
        };

        using var response = await SetDropInsAsync(client, cookie, series.Id, set);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("sessions_invalid", (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
        using var scope = factory.Services.CreateScope();
        Assert.False(await scope.ServiceProvider.GetRequiredService<AppDbContext>().Registrations.AnyAsync(r => r.MemberId == memberId, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_a_series_with_no_drop_in_price_When_a_member_who_has_not_joined_ticks_a_date_Then_it_is_refused_sessions_invalid()
    {
        var series = AdminSeries.NewSeries("No Drop In Series", factory.Time.GetUtcNow(), priceCents: 6400, dropInPriceCents: null);
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "nodrop.series.dropin@example.org");

        using var response = await SetDropInsAsync(client, cookie, series.Id, sessions[3]);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("sessions_invalid", (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_member_who_holds_a_date_When_they_send_it_again_with_another_Then_they_hold_one_place_at_each()
    {
        var series = AdminSeries.NewSeries("Drop In Again", factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "ivy.series.dropin@example.org");
        var ivyId = await MemberSeries.MemberIdAsync(factory, "ivy.series.dropin@example.org");
        using var first = await SetDropInsAsync(client, cookie, series.Id, sessions[3]);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var before = await GoingAsync(sessions);

        using var response = await SetDropInsAsync(client, cookie, series.Id, sessions[3], sessions[4]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var after = await GoingAsync(sessions);
        Assert.Equal([0, 0, 0, 0, 1, 0, 0, 0], sessions.Select(id => after[id] - before[id]));
        using var scope = factory.Services.CreateScope();
        Assert.Equal(
            new[] { sessions[3], sessions[4] }.Order(),
            (await scope.ServiceProvider.GetRequiredService<AppDbContext>().Registrations.Where(r => r.MemberId == ivyId).Select(r => r.EventId).ToListAsync(TestContext.Current.CancellationToken)).Order());
    }

    private async Task<Dictionary<Guid, int>> GoingAsync(IReadOnlyList<Guid> sessions)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var going = await db.Registrations.Where(r => sessions.Contains(r.EventId))
            .GroupBy(r => r.EventId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Key, g => g.Count, TestContext.Current.CancellationToken);
        return sessions.ToDictionary(id => id, id => going.GetValueOrDefault(id));
    }
}
