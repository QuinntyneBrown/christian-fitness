using System.Net;
using ChristianFitness.Domain.Events;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-053 AC4, AC5 (ADR 0102): a member who joined the series changes their dates; the enrolment
/// stays, a date given up goes back, and a date ticked again is held at the series price. A member
/// who dropped in and then joins keeps the dates already held (L2-052 AC4). Today is April 15, 2026.
/// </summary>
public sealed class JoinedDropInDatesTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    [Fact]
    public async Task Given_a_joined_member_When_they_untick_a_date_Then_its_place_goes_back_and_they_stay_joined_and_in_the_chat()
    {
        var series = AdminSeries.NewSeries("Joined Untick", factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "grace.series.joinedchange@example.org");
        var graceId = await MemberSeries.MemberIdAsync(factory, "grace.series.joinedchange@example.org");
        using var joined = await JoinSeriesTests.JoinAsync(client, cookie, series.Id);
        Assert.Equal(HttpStatusCode.OK, joined.StatusCode);
        await using var hub = await SeriesHub.ConnectAsync(factory, cookie);

        // Every date to come but May 5 (session 5).
        using var response = await DropInDatesTests.SetDropInsAsync(client, cookie, series.Id, sessions[2], sessions[3], sessions[6], sessions[7]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await AdminSeries.JsonAsync(response);
        Assert.True(answer.GetProperty("joined").GetBoolean());
        Assert.Equal(
            [false, false, true, true, false, false, true, true],
            answer.GetProperty("sessions").EnumerateArray().Select(s => s.GetProperty("held").GetBoolean()));
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.True(await db.SeriesEnrolments.AnyAsync(e => e.MemberId == graceId && e.SeriesId == series.Id, TestContext.Current.CancellationToken));
        Assert.False(await db.Registrations.AnyAsync(r => r.MemberId == graceId && r.EventId == sessions[4], TestContext.Current.CancellationToken));
        Assert.Null((await hub.JoinAsync(series.Id)).Code);
    }

    [Fact]
    public async Task Given_a_joined_member_of_a_free_series_with_a_paid_drop_in_When_they_tick_a_date_again_Then_it_is_held_at_the_series_price()
    {
        var series = AdminSeries.NewSeries("Joined Tick Again", factory.Time.GetUtcNow(), priceCents: 0, dropInPriceCents: 1000);
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "hope.series.joinedchange@example.org");
        var hopeId = await MemberSeries.MemberIdAsync(factory, "hope.series.joinedchange@example.org");
        using var joined = await JoinSeriesTests.JoinAsync(client, cookie, series.Id);
        Assert.Equal(HttpStatusCode.OK, joined.StatusCode);
        using var unticked = await DropInDatesTests.SetDropInsAsync(client, cookie, series.Id, sessions[2], sessions[3], sessions[6], sessions[7]);
        Assert.Equal(HttpStatusCode.OK, unticked.StatusCode);

        using var response = await DropInDatesTests.SetDropInsAsync(client, cookie, series.Id, sessions[2], sessions[3], sessions[4], sessions[6], sessions[7]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var place = await db.Registrations.SingleAsync(r => r.MemberId == hopeId && r.EventId == sessions[4], TestContext.Current.CancellationToken);
        Assert.Equal(RegistrationStatus.Confirmed, place.Status);
    }

    [Fact]
    public async Task Given_a_joined_member_of_a_series_with_no_drop_in_When_they_tick_a_date_again_Then_it_is_held()
    {
        var series = AdminSeries.NewSeries("Joined No Drop In", factory.Time.GetUtcNow(), dropInPriceCents: null);
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "ivy.series.joinedchange@example.org");
        using var joined = await JoinSeriesTests.JoinAsync(client, cookie, series.Id);
        Assert.Equal(HttpStatusCode.OK, joined.StatusCode);
        using var unticked = await DropInDatesTests.SetDropInsAsync(client, cookie, series.Id, sessions[2], sessions[3], sessions[6], sessions[7]);
        Assert.Equal(HttpStatusCode.OK, unticked.StatusCode);

        using var response = await DropInDatesTests.SetDropInsAsync(client, cookie, series.Id, sessions[2], sessions[3], sessions[4], sessions[6], sessions[7]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True((await AdminSeries.JsonAsync(response)).GetProperty("sessions")[4].GetProperty("held").GetBoolean());
    }

    [Fact]
    public async Task Given_a_member_who_dropped_in_on_a_paid_date_When_they_join_Then_that_date_is_kept_and_every_other_is_held()
    {
        var series = AdminSeries.NewSeries("Drop In Then Join", factory.Time.GetUtcNow(), priceCents: 0, dropInPriceCents: 1000);
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "kai.series.joinedchange@example.org");
        var kaiId = await MemberSeries.MemberIdAsync(factory, "kai.series.joinedchange@example.org");
        using var dropped = await DropInDatesTests.SetDropInsAsync(client, cookie, series.Id, sessions[3]);
        Assert.Equal(HttpStatusCode.OK, dropped.StatusCode);

        using var response = await JoinSeriesTests.JoinAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var places = await db.Registrations.Where(r => r.MemberId == kaiId).ToDictionaryAsync(r => r.EventId, r => r.Status, TestContext.Current.CancellationToken);
        Assert.Equal(new[] { sessions[2], sessions[3], sessions[4], sessions[6], sessions[7] }.Order(), places.Keys.Order());
        // The date dropped in on keeps its drop-in price, so it stays reserved; the others are free with the series.
        Assert.Equal(RegistrationStatus.Reserved, places[sessions[3]]);
        Assert.All(places.Where(p => p.Key != sessions[3]), p => Assert.Equal(RegistrationStatus.Confirmed, p.Value));
    }
}
