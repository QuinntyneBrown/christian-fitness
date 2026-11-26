using System.Net;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-053 AC4 (ADR 0102): a member who holds dates changes them; a date to come left out gives its
/// place up as L2-012 states, a started date is kept whatever the set says, and a member left with
/// no enrolment and no date not ended leaves the series chat. Today is April 15, 2026: Couch to
/// 5K's April 7 and 14 are past, April 21 on are to come and May 12 is cancelled.
/// </summary>
public sealed class ChangeDropInDatesTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    [Fact]
    public async Task Given_a_member_who_holds_two_dates_When_they_untick_one_Then_that_place_goes_back_and_they_stay_in_the_chat()
    {
        var series = AdminSeries.NewSeries("Change Untick One", factory.Time.GetUtcNow(), dropInPriceCents: 1000);
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "grace.series.change@example.org");
        var graceId = await MemberSeries.MemberIdAsync(factory, "grace.series.change@example.org");
        using var first = await DropInDatesTests.SetDropInsAsync(client, cookie, series.Id, sessions[3], sessions[6]);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        await using var hub = await SeriesHub.ConnectAsync(factory, cookie);

        using var response = await DropInDatesTests.SetDropInsAsync(client, cookie, series.Id, sessions[3]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            [false, false, false, true, false, false, false, false],
            (await AdminSeries.JsonAsync(response)).GetProperty("sessions").EnumerateArray().Select(s => s.GetProperty("held").GetBoolean()));
        Assert.Equal([sessions[3]], await HeldAsync(graceId));
        Assert.Null((await hub.JoinAsync(series.Id)).Code);
    }

    [Fact]
    public async Task Given_two_members_in_the_chat_by_their_dates_When_one_unticks_every_date_Then_they_receive_nothing_more()
    {
        var series = AdminSeries.NewSeries("Change Untick All", factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (graceClient, graceCookie) = await MemberSeries.MemberAsync(factory, "grace.series.untick@example.org");
        var (hopeClient, hopeCookie) = await MemberSeries.MemberAsync(factory, "hope.series.untick@example.org");
        foreach (var (client, cookie) in new[] { (graceClient, graceCookie), (hopeClient, hopeCookie) })
        {
            using var dropped = await DropInDatesTests.SetDropInsAsync(client, cookie, series.Id, sessions[3]);
            Assert.Equal(HttpStatusCode.OK, dropped.StatusCode);
        }

        await using var grace = await SeriesHub.ConnectAsync(factory, graceCookie);
        await using var hope = await SeriesHub.ConnectAsync(factory, hopeCookie);
        Assert.Null((await grace.JoinAsync(series.Id)).Code);
        Assert.Null((await hope.JoinAsync(series.Id)).Code);

        using var response = await DropInDatesTests.SetDropInsAsync(graceClient, graceCookie, series.Id);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Null((await hope.SendAsync(series.Id, "Grace has gone")).Code);

        // Hope, still in the chat, is the proof the message has gone out; Grace, who has no date left, has none.
        Assert.Equal("Grace has gone", (await hope.NextAsync("Hope, who still holds a date")).Text);
        Assert.False(grace.Received.Reader.TryRead(out var stray), $"Grace received after unticking: {stray?.Text}");
        Assert.Equal("not_a_participant", (await grace.JoinAsync(series.Id)).Code);
    }

    [Fact]
    public async Task Given_a_member_who_holds_a_started_date_When_they_send_no_dates_Then_the_started_one_is_kept()
    {
        var series = AdminSeries.NewSeries("Change Started Kept", factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "ivy.series.change@example.org");
        var ivyId = await MemberSeries.MemberIdAsync(factory, "ivy.series.change@example.org");
        await factory.AddRegistrationsAsync([(sessions[1], ivyId)]);
        using var first = await DropInDatesTests.SetDropInsAsync(client, cookie, series.Id, sessions[1], sessions[3]);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        using var response = await DropInDatesTests.SetDropInsAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal([sessions[1]], await HeldAsync(ivyId));
    }

    [Fact]
    public async Task Given_a_suspended_member_who_holds_a_date_When_they_untick_it_Then_the_place_goes_back()
    {
        var series = AdminSeries.NewSeries("Change Suspended", factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "kai.series.change@example.org");
        var kaiId = await MemberSeries.MemberIdAsync(factory, "kai.series.change@example.org");
        using var first = await DropInDatesTests.SetDropInsAsync(client, cookie, series.Id, sessions[4]);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var kai = await db.Members.SingleAsync(m => m.Id == kaiId, TestContext.Current.CancellationToken);
            Assert.True(kai.TrySuspend("Repeated harassment"));
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        using var response = await DropInDatesTests.SetDropInsAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(await HeldAsync(kaiId));
    }

    private async Task<List<Guid>> HeldAsync(Guid memberId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Registrations.Where(r => r.MemberId == memberId).Select(r => r.EventId).ToListAsync(TestContext.Current.CancellationToken);
    }
}
