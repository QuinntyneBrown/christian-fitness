using System.Net;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-052 AC9 (ADR 0101): a joined member leaves a series. Their places at sessions that have not
/// started (cancelled ones included) are removed, the enrolment and those sessions' going fall by
/// one, they leave the series chat, and the places at started sessions and every message stay. A
/// member who has not joined gets the series unchanged. Today is April 15, 2026: Couch to 5K's
/// April 7 and 14 are past, May 12 is cancelled.
/// </summary>
public sealed class LeaveSeriesTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    internal static async Task<HttpResponseMessage> LeaveAsync(HttpClient client, string cookie, Guid seriesId) =>
        await Browser.SendAsync(client, HttpMethod.Delete, $"{MemberSeries.Path}/{seriesId}/enrolment/me", cookie);

    [Fact]
    public async Task Given_a_joined_member_When_they_leave_Then_the_places_to_come_go_back_and_the_past_ones_stay()
    {
        var series = AdminSeries.NewSeries("Couch to 5K Leave", factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "grace.series.leave@example.org");
        var graceId = await MemberSeries.MemberIdAsync(factory, "grace.series.leave@example.org");
        // She came to April 7 and held the cancelled May 12 before it was cancelled.
        await factory.AddRegistrationsAsync([(sessions[0], graceId), (sessions[5], graceId)]);
        using (var joined = await JoinSeriesTests.JoinAsync(client, cookie, series.Id))
        {
            Assert.Equal(HttpStatusCode.OK, joined.StatusCode);
        }

        var before = await GoingAsync(sessions);
        var enrolled = await EnrolledAsync(series.Id);

        using var response = await LeaveAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await AdminSeries.JsonAsync(response);
        Assert.Equal(series.Id, answer.GetProperty("id").GetGuid());
        Assert.False(answer.GetProperty("joined").GetBoolean());
        Assert.Equal(
            [true, false, false, false, false, false, false, false],
            answer.GetProperty("sessions").EnumerateArray().Select(s => s.GetProperty("held").GetBoolean()));
        var after = await GoingAsync(sessions);
        Assert.Equal([0, 0, -1, -1, -1, -1, -1, -1], sessions.Select(id => after[id] - before[id]));
        Assert.Equal(enrolled - 1, await EnrolledAsync(series.Id));
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await db.SeriesEnrolments.AnyAsync(e => e.SeriesId == series.Id && e.MemberId == graceId, TestContext.Current.CancellationToken));
        Assert.Equal(
            [sessions[0]],
            await db.Registrations.Where(r => r.MemberId == graceId).Select(r => r.EventId).ToListAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_a_joined_member_who_wrote_in_the_chat_When_they_leave_Then_they_are_out_of_it_and_their_message_stays()
    {
        var series = AdminSeries.NewSeries("Couch to 5K Leave Chat", factory.Time.GetUtcNow());
        await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "hope.series.leave@example.org");
        using (var joined = await JoinSeriesTests.JoinAsync(client, cookie, series.Id))
        {
            Assert.Equal(HttpStatusCode.OK, joined.StatusCode);
        }

        await using var hub = await SeriesHub.ConnectAsync(factory, cookie);
        Assert.Null((await hub.JoinAsync(series.Id)).Code);
        Assert.Null((await hub.SendAsync(series.Id, "See you Tuesday")).Code);

        using var response = await LeaveAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("not_a_participant", (await hub.JoinAsync(series.Id)).Code);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.ChatMessages.CountAsync(m => m.ScopeId == series.Id, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_a_joined_member_connected_to_the_chat_When_they_leave_Then_they_receive_nothing_more()
    {
        var series = AdminSeries.NewSeries("Couch to 5K Leave Push", factory.Time.GetUtcNow());
        await factory.AddCouchTo5KAsync(series);
        var (graceClient, graceCookie) = await MemberSeries.MemberAsync(factory, "grace.series.push@example.org");
        var (hopeClient, hopeCookie) = await MemberSeries.MemberAsync(factory, "hope.series.push@example.org");
        foreach (var (client, cookie) in new[] { (graceClient, graceCookie), (hopeClient, hopeCookie) })
        {
            using var joined = await JoinSeriesTests.JoinAsync(client, cookie, series.Id);
            Assert.Equal(HttpStatusCode.OK, joined.StatusCode);
        }

        await using var grace = await SeriesHub.ConnectAsync(factory, graceCookie);
        await using var hope = await SeriesHub.ConnectAsync(factory, hopeCookie);
        Assert.Null((await grace.JoinAsync(series.Id)).Code);
        Assert.Null((await hope.JoinAsync(series.Id)).Code);

        using var left = await LeaveAsync(graceClient, graceCookie, series.Id);
        Assert.Equal(HttpStatusCode.OK, left.StatusCode);
        Assert.Null((await hope.SendAsync(series.Id, "Grace has left")).Code);

        // Hope, still in the chat, is the proof the message has gone out; Grace, who left, has none.
        Assert.Equal("Grace has left", (await hope.NextAsync("Hope, who is still in the chat")).Text);
        Assert.False(grace.Received.Reader.TryRead(out var stray), $"Grace received after leaving: {stray?.Text}");
    }

    [Fact]
    public async Task Given_a_member_who_has_not_joined_When_they_leave_Then_the_series_is_answered_unchanged()
    {
        var series = AdminSeries.NewSeries("Couch to 5K Not Joined Leave", factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "noor.series.leave@example.org");
        var noorId = await MemberSeries.MemberIdAsync(factory, "noor.series.leave@example.org");
        // A drop-in place is not the series' to take back.
        await factory.AddRegistrationsAsync([(sessions[3], noorId)]);
        var enrolled = await EnrolledAsync(series.Id);

        using var response = await LeaveAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False((await AdminSeries.JsonAsync(response)).GetProperty("joined").GetBoolean());
        Assert.Equal(enrolled, await EnrolledAsync(series.Id));
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.True(await db.Registrations.AnyAsync(r => r.MemberId == noorId && r.EventId == sessions[3], TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_a_series_that_does_not_exist_When_a_member_leaves_Then_it_is_not_found()
    {
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "unknown.series.leave@example.org");

        using var response = await LeaveAsync(client, cookie, Guid.CreateVersion7());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("series_not_found", (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
    }

    private async Task<int> EnrolledAsync(Guid seriesId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.SeriesEnrolments.CountAsync(e => e.SeriesId == seriesId, TestContext.Current.CancellationToken);
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
