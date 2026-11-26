using System.Net;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-052 AC5 to AC7 (ADR 0099): a series with no place left, or no session to come, is refused
/// <c>series_full</c> and nothing is held; joining again holds no second place; a suspended member
/// is refused <c>account_suspended</c>; a series that does not open is <c>series_not_found</c>.
/// Today is April 15, 2026.
/// </summary>
public sealed class JoinSeriesRefusalTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    [Fact]
    public async Task Given_a_session_to_come_with_no_place_left_When_a_member_joins_Then_it_is_refused_series_full_and_nothing_is_held()
    {
        var series = AdminSeries.NewSeries("Full Join Run", factory.Time.GetUtcNow(), capacity: 3);
        var sessions = await factory.AddCouchTo5KAsync(series);
        // May 19 (the seventh date) is to come and full; the others have places.
        await factory.AddRegistrationsAsync([.. Enumerable.Range(0, 3).Select(_ => (sessions[6], Guid.NewGuid()))]);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "full.series.join@example.org");
        var memberId = await MemberSeries.MemberIdAsync(factory, "full.series.join@example.org");

        using var response = await JoinSeriesTests.JoinAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("series_full", (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
        await AssertNothingHeldAsync(series.Id, memberId);
    }

    [Fact]
    public async Task Given_a_full_session_already_past_When_a_member_joins_Then_the_places_to_come_decide()
    {
        var series = AdminSeries.NewSeries("Past Full Run", factory.Time.GetUtcNow(), capacity: 3);
        var sessions = await factory.AddCouchTo5KAsync(series);
        // April 14 is past and full; every date to come has places.
        await factory.AddRegistrationsAsync([.. Enumerable.Range(0, 3).Select(_ => (sessions[1], Guid.NewGuid()))]);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "pastfull.series.join@example.org");

        using var response = await JoinSeriesTests.JoinAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_series_with_no_session_to_come_When_a_member_joins_Then_it_is_refused_series_full()
    {
        var series = AdminSeries.NewSeries("Finished Join Run", factory.Time.GetUtcNow());
        await factory.AddSeriesAsync(series, [new(new DateOnly(2026, 4, 7)), new(new DateOnly(2026, 4, 14)), new(new DateOnly(2026, 4, 21), Cancelled: true)]);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "finished.series.join@example.org");
        var memberId = await MemberSeries.MemberIdAsync(factory, "finished.series.join@example.org");

        using var response = await JoinSeriesTests.JoinAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("series_full", (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
        await AssertNothingHeldAsync(series.Id, memberId);
    }

    [Fact]
    public async Task Given_a_member_who_joined_When_they_join_again_Then_the_series_is_answered_unchanged_with_no_second_place()
    {
        var series = AdminSeries.NewSeries("Twice Join Run", factory.Time.GetUtcNow());
        await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "twice.series.join@example.org");
        var memberId = await MemberSeries.MemberIdAsync(factory, "twice.series.join@example.org");
        using var first = await JoinSeriesTests.JoinAsync(client, cookie, series.Id);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var spotsLeft = (await AdminSeries.JsonAsync(first)).GetProperty("spotsLeft").GetInt32();

        using var again = await JoinSeriesTests.JoinAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        var answer = await AdminSeries.JsonAsync(again);
        Assert.True(answer.GetProperty("joined").GetBoolean());
        Assert.Equal(spotsLeft, answer.GetProperty("spotsLeft").GetInt32());
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.SeriesEnrolments.CountAsync(e => e.SeriesId == series.Id && e.MemberId == memberId, TestContext.Current.CancellationToken));
        Assert.Equal(5, await db.Registrations.CountAsync(r => r.MemberId == memberId, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_a_suspended_member_When_they_join_Then_it_is_refused_account_suspended_and_nothing_is_held()
    {
        var series = AdminSeries.NewSeries("Suspended Join Run", factory.Time.GetUtcNow());
        await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "suspended.series.join@example.org");
        var memberId = await MemberSeries.MemberIdAsync(factory, "suspended.series.join@example.org");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var member = await db.Members.SingleAsync(m => m.Id == memberId, TestContext.Current.CancellationToken);
            Assert.True(member.TrySuspend("Repeated harassment"));
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        using var response = await JoinSeriesTests.JoinAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("account_suspended", (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
        await AssertNothingHeldAsync(series.Id, memberId);
    }

    [Fact]
    public async Task Given_a_series_that_does_not_exist_When_a_member_joins_Then_it_is_not_found()
    {
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "unknown.series.join@example.org");

        using var response = await JoinSeriesTests.JoinAsync(client, cookie, Guid.CreateVersion7());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("series_not_found", (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
    }

    private async Task AssertNothingHeldAsync(Guid seriesId, Guid memberId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await db.SeriesEnrolments.AnyAsync(e => e.SeriesId == seriesId && e.MemberId == memberId, TestContext.Current.CancellationToken));
        Assert.False(await db.Registrations.AnyAsync(r => r.MemberId == memberId, TestContext.Current.CancellationToken));
    }
}
