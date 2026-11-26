using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Events;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-052 AC2 and AC4 (ADR 0101): a member joins a series and holds a place at every session still
/// to come that is not cancelled; the enrolment and each of those sessions' going rise by one, the
/// places of a paid series are reserved, a date already held keeps its own place, and the member is
/// in the series' chat. Today is April 15, 2026: Couch to 5K's April 21, 28, May 5, 19 and 26 are to
/// come, May 12 is cancelled, April 7 and 14 are past.
/// </summary>
public sealed class JoinSeriesTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    internal static async Task<HttpResponseMessage> JoinAsync(HttpClient client, string cookie, Guid seriesId) =>
        await Browser.SendAsync(client, HttpMethod.Post, $"{MemberSeries.Path}/{seriesId}/enrolment", cookie);

    [Fact]
    public async Task Given_a_series_not_joined_When_a_member_joins_Then_they_hold_every_session_to_come_and_each_going_and_the_enrolment_rise_by_one()
    {
        var series = AdminSeries.NewSeries("Couch to 5K Join", factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        var others = Guid.NewGuid();
        await factory.AddRegistrationsAsync([.. sessions.Select(id => (id, others))]);
        var before = await GoingAsync(sessions);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "grace.series.join@example.org");
        var graceId = await MemberSeries.MemberIdAsync(factory, "grace.series.join@example.org");

        using var response = await JoinAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(series.Id, answer.GetProperty("id").GetGuid());
        Assert.True(answer.GetProperty("joined").GetBoolean());
        Assert.Equal(
            [false, false, true, true, true, false, true, true],
            answer.GetProperty("sessions").EnumerateArray().Select(s => s.GetProperty("held").GetBoolean()));
        // Every session had one place taken by "others"; the five to come now have two.
        Assert.Equal(40 - 2, answer.GetProperty("spotsLeft").GetInt32());
        var after = await GoingAsync(sessions);
        Assert.Equal([0, 0, 1, 1, 1, 0, 1, 1], sessions.Select(id => after[id] - before[id]));
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var enrolment = await db.SeriesEnrolments.SingleAsync(e => e.SeriesId == series.Id && e.MemberId == graceId, TestContext.Current.CancellationToken);
        Assert.Equal(RegistrationStatus.Confirmed, enrolment.Status);
        Assert.Equal(32, await db.SeriesEnrolments.CountAsync(e => e.SeriesId == series.Id, TestContext.Current.CancellationToken));
        Assert.All(
            await db.Registrations.Where(r => r.MemberId == graceId).ToListAsync(TestContext.Current.CancellationToken),
            r => Assert.Equal(RegistrationStatus.Confirmed, r.Status));
    }

    [Fact]
    public async Task Given_a_member_who_joined_When_they_open_the_series_chat_Then_they_are_in_it()
    {
        var series = AdminSeries.NewSeries("Couch to 5K Join Chat", factory.Time.GetUtcNow());
        await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "hope.series.join@example.org");
        await using var hub = await SeriesHub.ConnectAsync(factory, cookie);
        Assert.Equal("not_a_participant", (await hub.JoinAsync(series.Id)).Code);

        using var response = await JoinAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Null((await hub.JoinAsync(series.Id)).Code);
    }

    [Fact]
    public async Task Given_a_paid_series_When_a_member_joins_Then_the_enrolment_and_every_place_are_reserved()
    {
        var series = AdminSeries.NewSeries("Paid Bootcamp Join", factory.Time.GetUtcNow(), priceCents: 6400, dropInPriceCents: 1000);
        await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "mae.series.join@example.org");
        var maeId = await MemberSeries.MemberIdAsync(factory, "mae.series.join@example.org");

        using var response = await JoinAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(
            RegistrationStatus.Reserved,
            (await db.SeriesEnrolments.SingleAsync(e => e.SeriesId == series.Id && e.MemberId == maeId, TestContext.Current.CancellationToken)).Status);
        var places = await db.Registrations.Where(r => r.MemberId == maeId).ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(5, places.Count);
        Assert.All(places, r => Assert.Equal(RegistrationStatus.Reserved, r.Status));
    }

    [Fact]
    public async Task Given_a_member_who_dropped_in_on_a_free_date_of_a_paid_series_When_they_join_Then_that_place_is_kept_and_the_rest_are_added_reserved()
    {
        // The drop-in is free (a $0 drop-in price), so its place is confirmed and the series' are reserved: the kept place is told apart by its status.
        var series = AdminSeries.NewSeries("Drop In Then Join", factory.Time.GetUtcNow(), priceCents: 6400, dropInPriceCents: 0);
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "noor.series.join@example.org");
        var noorId = await MemberSeries.MemberIdAsync(factory, "noor.series.join@example.org");
        using var dropped = await Browser.SendAsync(client, HttpMethod.Post, $"/api/events/{sessions[3]}/registrations", cookie);
        Assert.Equal(HttpStatusCode.OK, dropped.StatusCode);
        var kept = await PlaceAsync(sessions[3], noorId);

        using var response = await JoinAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var places = await db.Registrations.Where(r => r.MemberId == noorId).ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(5, places.Count);
        Assert.Single(places, r => r.EventId == sessions[3]);
        var april28 = places.Single(r => r.EventId == sessions[3]);
        Assert.Equal((kept.Id, RegistrationStatus.Confirmed), (april28.Id, april28.Status));
        Assert.All(places.Where(r => r.EventId != sessions[3]), r => Assert.Equal(RegistrationStatus.Reserved, r.Status));
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

    private async Task<Registration> PlaceAsync(Guid sessionId, Guid memberId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Registrations.AsNoTracking().SingleAsync(r => r.EventId == sessionId && r.MemberId == memberId, TestContext.Current.CancellationToken);
    }
}
