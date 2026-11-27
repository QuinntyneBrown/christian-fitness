using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Application.Newsletter;
using ChristianFitness.Domain.Newsletter;
using ChristianFitness.Domain.News;
using ChristianFitness.Infrastructure.Persistence;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Newsletter;

/// <summary>The desk's API with a relay that takes two emails a minute, subscribers put in the store, and the scheduler's issue job run by hand.</summary>
public class SendIssueFactory : NewsletterCandidatesFactory
{
    public const int PerMinute = 2;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("Email:MaxPerMinute", "2");
        builder.UseSetting("Email:MaxPerDay", "1000");
    }

    /// <summary>Puts a subscription for <paramref name="email"/> in the store at <paramref name="status"/>.</summary>
    internal async Task AddSubscriberAsync(string email, SubscriptionStatus status = SubscriptionStatus.Subscribed)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var subscription = NewsletterSubscription.Request(email, Time.GetUtcNow());
        if (status != SubscriptionStatus.Pending)
        {
            subscription.Confirm(Time.GetUtcNow());
        }

        if (status == SubscriptionStatus.Unsubscribed)
        {
            subscription.Unsubscribe(Time.GetUtcNow());
        }

        db.NewsletterSubscriptions.Add(subscription);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>One run of the scheduler's issue job, as a tick of the publishing clock runs it.</summary>
    internal async Task<IssueTick> TickAsync()
    {
        using var scope = Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<ISender>().Send(new SendDueIssueCommand(), TestContext.Current.CancellationToken);
    }
}

/// <summary>
/// L2-070 AC7, AC10 and AC13 (journey 28, slice 5): at its time a Scheduled issue is sent once to
/// every confirmed subscriber, within the relay's limit per minute, greeting a member by first name
/// and anyone else with "Hi there", each with its own Unsubscribe link and no link off the member
/// app; it then shows under Sent with how many it went to, the next Draft is made, and the send is
/// audited against the Admin who scheduled it.
/// </summary>
public sealed partial class SendIssueTests(SendIssueFactory factory) : IClassFixture<SendIssueFactory>
{
    [Fact]
    public async Task Given_a_Scheduled_issue_When_its_time_arrives_Then_it_is_sent_once_to_each_confirmed_subscriber_and_shows_under_Sent()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Desk.SignInAsync(factory, client, "dana.send@example.org");
        using var memberClient = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, memberClient, "grace.send@example.org", role: null);
        await factory.AddSubscriberAsync("grace.send@example.org");
        await factory.AddSubscriberAsync("visitor.send@example.org");
        await factory.AddSubscriberAsync("third.send@example.org");
        await factory.AddSubscriberAsync("pending.send@example.org", SubscriptionStatus.Pending);
        await factory.AddSubscriberAsync("left.send@example.org", SubscriptionStatus.Unsubscribed);
        var lead = await factory.PutStoryAsync("Send lead story", StoryStatus.Published, slug: "send-lead-story");
        var also = await factory.PutStoryAsync("Send also story", StoryStatus.Published, slug: "send-also-story");
        var featured = await factory.AddEventAsync("Send featured event", TimeSpan.FromDays(9));
        var desk = await Desk.ReadAsync(client, cookie);
        var number = desk.GetProperty("nextIssue").GetProperty("number").GetInt32();
        var sendAt = desk.GetProperty("nextIssue").GetProperty("sendAt").GetDateTimeOffset();
        using var scheduled = await Desk.PostAsync(client, cookie, number, "schedule", Desk.Fields(lead.Id, [also.Id], [featured], subject: "The send subject"));
        Assert.Equal(HttpStatusCode.OK, scheduled.StatusCode);
        var before = factory.Emails.Sent().Count;

        factory.Time.SetUtcNow(sendAt.AddSeconds(-1));
        Assert.Equal(new IssueTick(false, 0, false, false), await factory.TickAsync());
        factory.Time.SetUtcNow(sendAt);
        var first = await factory.TickAsync();
        var sameMinute = await factory.TickAsync();
        cookie = await Desk.SignInAgainAsync(factory, client, "dana.send@example.org");
        using var tooLate = await Desk.PostAsync(client, cookie, number, "unschedule");
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        var last = await factory.TickAsync();
        var after = await factory.TickAsync();

        Assert.Equal(new IssueTick(true, SendIssueFactory.PerMinute, false, false), first);
        Assert.Equal(new IssueTick(false, 0, false, false), sameMinute);
        Assert.Equal(HttpStatusCode.Conflict, tooLate.StatusCode);
        Assert.Equal(new IssueTick(false, 1, true, false), last);
        Assert.Equal(new IssueTick(false, 0, false, false), after);
        var emails = factory.Emails.Sent().Skip(before).ToArray();
        Assert.Equal(
            ["grace.send@example.org", "third.send@example.org", "visitor.send@example.org"],
            emails.Select(e => e.To).Order(StringComparer.Ordinal));
        Assert.All(emails, e => Assert.Equal("The send subject", e.Subject));
        var grace = emails.Single(e => e.To == "grace.send@example.org");
        var visitor = emails.Single(e => e.To == "visitor.send@example.org");
        Assert.StartsWith("Hi Grace,", grace.Text, StringComparison.Ordinal);
        Assert.StartsWith("Hi there,", visitor.Text, StringComparison.Ordinal);
        Assert.Contains("Friends, the first candle is lit.", grace.Text, StringComparison.Ordinal);
        Assert.Contains("Send lead story\nhttps://members.example.test/stories/send-lead-story", grace.Text, StringComparison.Ordinal);
        Assert.Contains("Send also story\nhttps://members.example.test/stories/send-also-story", grace.Text, StringComparison.Ordinal);
        Assert.Contains($"https://members.example.test/e/{featured}", grace.Text, StringComparison.Ordinal);
        Assert.Contains("Whether you eat or drink, do it all for the glory of God.\n1 Corinthians 10:31", grace.Text, StringComparison.Ordinal);
        // No tracking image and no redirected link (AC10): every link starts with the member app's address.
        Assert.All(emails, e => Assert.All(Links().Matches(e.Text), l => Assert.StartsWith("https://members.example.test/", l.Value, StringComparison.Ordinal)));
        var tokens = emails.Select(e => Newsletter.UnsubscribeTokenOf(e)).ToArray();
        Assert.Equal(3, tokens.Distinct(StringComparer.Ordinal).Count());
        Assert.All(tokens, t => Assert.Equal(43, t.Length));
        Assert.All(emails, e => Assert.Equal("List-Unsubscribe=One-Click", e.Headers["List-Unsubscribe-Post"]));

        var deskAfter = await Desk.ReadAsync(client, cookie);
        var sent = deskAfter.GetProperty("sent").EnumerateArray().First();
        Assert.Equal(["number", "sentAt", "subject", "recipients"], sent.EnumerateObject().Select(p => p.Name));
        Assert.Equal(
            (number, sendAt.AddMinutes(1), "The send subject", 3),
            (sent.GetProperty("number").GetInt32(), sent.GetProperty("sentAt").GetDateTimeOffset(), sent.GetProperty("subject").GetString(), sent.GetProperty("recipients").GetInt32()));
        var next = deskAfter.GetProperty("nextIssue");
        Assert.Equal((number + 1, "draft", sendAt.AddDays(7)), (next.GetProperty("number").GetInt32(), next.GetProperty("status").GetString(), next.GetProperty("sendAt").GetDateTimeOffset()));

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var admin = await db.Members.Where(m => m.Email == "dana.send@example.org").Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var issue = await db.NewsletterIssues.AsNoTracking().SingleAsync(i => i.Number == number, TestContext.Current.CancellationToken);
        Assert.Equal(IssueStatus.Sent, issue.Status);
        var entry = Assert.Single(await db.AuditEntries.AsNoTracking().Where(e => e.Action == "newsletter_issue.sent_by_scheduler").ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((admin, nameof(NewsletterIssue), issue.Id), (entry.ActorMemberId, entry.RecordType, entry.RecordId));
        // No record of who was sent the issue is left.
        Assert.Empty(await db.IssueDeliveries.AsNoTracking().ToListAsync(TestContext.Current.CancellationToken));
    }

    [GeneratedRegex(@"https?://\S+")]
    private static partial Regex Links();
}

/// <summary>
/// L2-070 AC8 (journey 28, slice 5): an issue still a Draft when its time arrives sends nothing and
/// is marked missed; it can be scheduled for a later time that same day in Toronto and then goes
/// out; a time already past, or on another day, is refused.
/// </summary>
public sealed class MissedIssueTests(SendIssueFactory factory) : IClassFixture<SendIssueFactory>
{
    [Fact]
    public async Task Given_a_Draft_at_its_time_When_the_time_passes_Then_nothing_is_sent_it_is_missed_and_it_can_go_out_later_that_day()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Desk.SignInAsync(factory, client, "dana.missed@example.org");
        await factory.AddSubscriberAsync("reader.missed@example.org");
        var lead = await factory.PutStoryAsync("Missed lead story", StoryStatus.Published);
        var desk = await Desk.ReadAsync(client, cookie);
        var number = desk.GetProperty("nextIssue").GetProperty("number").GetInt32();
        var sendAt = desk.GetProperty("nextIssue").GetProperty("sendAt").GetDateTimeOffset();
        Assert.False(desk.GetProperty("nextIssue").GetProperty("missedSend").GetBoolean());
        var before = factory.Emails.Sent().Count;

        // 7:00 AM in Toronto passes with the issue a Draft; it is now 8:30 AM.
        factory.Time.SetUtcNow(sendAt.AddMinutes(90));
        var tick = await factory.TickAsync();
        cookie = await Desk.SignInAgainAsync(factory, client, "dana.missed@example.org");

        Assert.Equal(new IssueTick(false, 0, false, true), tick);
        Assert.Equal(before, factory.Emails.Sent().Count);
        var awaiting = await AwaitingAsync(client, cookie);
        Assert.Equal((number, sendAt), (awaiting.GetProperty("missedIssue").GetProperty("number").GetInt32(), awaiting.GetProperty("missedIssue").GetProperty("wasDueAt").GetDateTimeOffset()));
        var missed = (await Desk.ReadAsync(client, cookie)).GetProperty("nextIssue");
        Assert.Equal(("draft", true), (missed.GetProperty("status").GetString(), missed.GetProperty("missedSend").GetBoolean()));

        var fields = Desk.Fields(lead.Id);
        fields["sendTime"] = "08:00";
        using var past = await Desk.PostAsync(client, cookie, number, "schedule", fields);
        Assert.Equal(HttpStatusCode.BadRequest, past.StatusCode);
        Assert.Equal("send_time_invalid", (await Desk.JsonAsync(past)).GetProperty("fieldCodes").GetProperty("sendTime").GetString());
        fields["sendTime"] = "11:00";
        using var rescheduled = await Desk.PostAsync(client, cookie, number, "schedule", fields);
        Assert.Equal(HttpStatusCode.OK, rescheduled.StatusCode);
        var issue = await Desk.JsonAsync(rescheduled);
        Assert.Equal(("scheduled", sendAt.AddHours(4)), (issue.GetProperty("status").GetString(), issue.GetProperty("sendAt").GetDateTimeOffset()));
        Assert.False((await AwaitingAsync(client, cookie)).TryGetProperty("missedIssue", out _));

        factory.Time.SetUtcNow(sendAt.AddHours(4));
        Assert.Equal(new IssueTick(true, 1, true, false), await factory.TickAsync());
        Assert.Equal("reader.missed@example.org", factory.Emails.Sent().Skip(before).Single().To);
    }

    /// <summary>The Dashboard's "Needs attention", as the console reads it.</summary>
    private static async Task<JsonElement> AwaitingAsync(HttpClient client, string cookie)
    {
        using var response = await ChristianFitness.Api.Tests.Events.AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/dashboard/awaiting", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await Desk.JsonAsync(response);
    }
}

/// <summary>
/// L2-070 AC8: a missed issue never rescheduled is, once its day in Toronto has passed, an ordinary
/// Draft for the next send time and is not sent.
/// </summary>
public sealed class MissedDayPassedTests(SendIssueFactory factory) : IClassFixture<SendIssueFactory>
{
    [Fact]
    public async Task Given_a_missed_issue_When_its_day_passes_Then_it_is_a_Draft_for_the_next_send_time_and_nothing_is_sent()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Desk.SignInAsync(factory, client, "dana.missed.day@example.org");
        await factory.AddSubscriberAsync("reader.missed.day@example.org");
        var sendAt = (await Desk.ReadAsync(client, cookie)).GetProperty("nextIssue").GetProperty("sendAt").GetDateTimeOffset();
        var before = factory.Emails.Sent().Count;
        factory.Time.SetUtcNow(sendAt.AddHours(1));
        Assert.True((await factory.TickAsync()).Missed);

        // Midnight in Toronto is 17 hours after 7 AM.
        factory.Time.SetUtcNow(sendAt.AddHours(17));
        var tick = await factory.TickAsync();
        cookie = await Desk.SignInAgainAsync(factory, client, "dana.missed.day@example.org");

        Assert.Equal(new IssueTick(false, 0, false, false), tick);
        var issue = (await Desk.ReadAsync(client, cookie)).GetProperty("nextIssue");
        Assert.Equal(("draft", false, sendAt.AddDays(7)), (issue.GetProperty("status").GetString(), issue.GetProperty("missedSend").GetBoolean(), issue.GetProperty("sendAt").GetDateTimeOffset()));
        Assert.Equal(before, factory.Emails.Sent().Count);
    }
}

/// <summary>
/// L2-064 AC8 with L2-070 AC7: an address subscribed only to an extra, the Weekly switched off on
/// Preferences, is not counted among the issue's readers and is sent no issue.
/// </summary>
public sealed class WeeklyOffTests(SendIssueFactory factory) : IClassFixture<SendIssueFactory>
{
    [Fact]
    public async Task Given_an_address_with_the_Weekly_off_When_an_issue_is_sent_Then_it_is_not_counted_and_gets_no_issue()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Desk.SignInAsync(factory, client, "dana.weekly.off@example.org");
        await factory.AddSubscriberAsync("reader.weekly.on@example.org");
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var extraOnly = NewsletterSubscription.ForAccount("reader.weekly.off@example.org", factory.Time.GetUtcNow());
            extraOnly.SetEmails(weekly: false, eventAlerts: false, trainingPlan: false, devotion: true, factory.Time.GetUtcNow());
            db.NewsletterSubscriptions.Add(extraOnly);
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        var lead = await factory.PutStoryAsync("Weekly off lead", StoryStatus.Published);
        var desk = await Desk.ReadAsync(client, cookie);
        var number = desk.GetProperty("nextIssue").GetProperty("number").GetInt32();
        Assert.Equal(1, desk.GetProperty("confirmedSubscribers").GetInt32());
        using var scheduled = await Desk.PostAsync(client, cookie, number, "schedule", Desk.Fields(lead.Id));
        Assert.Equal(HttpStatusCode.OK, scheduled.StatusCode);
        var before = factory.Emails.Sent().Count;

        factory.Time.SetUtcNow(desk.GetProperty("nextIssue").GetProperty("sendAt").GetDateTimeOffset());
        var tick = await factory.TickAsync();

        Assert.Equal(new IssueTick(true, 1, true, false), tick);
        Assert.Equal(["reader.weekly.on@example.org"], factory.Emails.Sent().Skip(before).Select(e => e.To));
    }
}
