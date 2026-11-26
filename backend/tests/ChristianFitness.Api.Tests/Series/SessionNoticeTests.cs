using System.Net;
using ChristianFitness.Application.Seeding;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Notifications;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-071 AC4, L2-052 AC10 (ADR 0103): when staff cancel a series date, the series chat gets one
/// notice from the Christian Fitness account, pushed to those in it, and every member holding a
/// place at that date, each once, gets a "Cancelled series date" notification; a member who joined
/// but holds no place there gets none. Today is April 15, 2026; May 5 is a Tuesday.
/// </summary>
public sealed class SessionNoticeTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    private const int May5 = 4;

    private async Task SeedSystemAccountAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await new SeedRunner([new SystemAccountSeed(factory.Time)], db).RunAsync(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Given_three_holding_May_5_When_staff_cancel_it_Then_each_gets_one_Cancelled_series_date_notification_and_no_one_else()
    {
        await SeedSystemAccountAsync();
        var (series, sessions, holders, other) = await CancelSessionTests.CouchWithPlacesAsync(factory, "Couch Notice");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.notice@example.org");

        using var response = await CancelSessionTests.CancelAsync(client, cookie, series.Id, sessions[May5]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notes = await db.Notifications.AsNoTracking()
            .Where(n => holders.Contains(n.MemberId) || n.MemberId == other)
            .ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(holders.Order(), notes.Select(n => n.MemberId).Order());
        Assert.All(notes, n => Assert.Equal(
            (NotificationKind.SeriesDateCancelled, "Cancelled date: Couch Notice", "Tue, May 5 is off; the other dates in the series stand.", $"/events/series/{series.Id}"),
            (n.Kind, n.Title, n.Text, n.Href)));
    }

    [Fact]
    public async Task Given_a_member_in_the_series_chat_When_staff_cancel_May_5_Then_the_chat_gets_the_notice_from_Christian_Fitness_live_and_in_its_history()
    {
        await SeedSystemAccountAsync();
        var series = AdminSeries.NewSeries("Couch Notice Chat", factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        var (memberClient, memberCookie) = await MemberSeries.MemberAsync(factory, "eve.series.notice@example.org");
        memberClient.Dispose();
        await MemberSeries.EnrolAsync(factory, series, "eve.series.notice@example.org");
        await using var hub = await SeriesHub.ConnectAsync(factory, memberCookie);
        Assert.Null((await hub.JoinAsync(series.Id)).Code);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.notice.chat@example.org");

        using var response = await CancelSessionTests.CancelAsync(client, cookie, series.Id, sessions[May5]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var pushed = await hub.NextAsync("the cancellation notice");
        Assert.Equal(
            (series.Id, SystemMembers.ChristianFitnessId, SystemMembers.ChristianFitnessName, "Tue, May 5 is cancelled. The other dates in the series stand."),
            (pushed.EventId, pushed.AuthorId, pushed.Author, pushed.Text));
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var stored = Assert.Single(await db.ChatMessages.AsNoTracking().Where(m => m.ScopeId == series.Id).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((ChatScopeKind.Series, SystemMembers.ChristianFitnessId, pushed.Text), (stored.ScopeKind, stored.AuthorId, stored.Text));
    }

    [Fact]
    public async Task Given_a_series_title_of_120_characters_When_a_date_is_cancelled_Then_the_notification_title_is_cut_to_120_with_an_ellipsis()
    {
        await SeedSystemAccountAsync();
        var title = "Couch Notice Long " + new string('x', 102);
        var (series, sessions, holders, _) = await CancelSessionTests.CouchWithPlacesAsync(factory, title);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.notice.long@example.org");

        using var response = await CancelSessionTests.CancelAsync(client, cookie, series.Id, sessions[May5]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var note = await db.Notifications.AsNoTracking().FirstAsync(n => n.MemberId == holders[0], TestContext.Current.CancellationToken);
        Assert.Equal(120, note.Title.Length);
        Assert.Equal(("Cancelled date: Couch Notice Long x", '…'), (note.Title[..35], note.Title[^1]));
    }
}
