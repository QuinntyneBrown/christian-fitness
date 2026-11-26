using System.Globalization;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Email;
using ChristianFitness.Domain.Audit;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Newsletter;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Newsletter;

/// <summary>
/// The publishing clock's newsletter job (L2-070 AC7, AC8, AC13; ADR 0069, ADR 0070). For the issue
/// whose time has passed: a Draft is marked missed and nothing is sent, and once its day in Toronto
/// has passed it waits for the next send time; a Scheduled issue starts sending, one delivery per
/// confirmed subscriber in the same save, so a second tick starts nothing. Then it sends the waiting
/// deliveries, within the relay's limits, and with none left the issue is Sent.
/// </summary>
public sealed record SendDueIssueCommand : IRequest<IssueTick>;

/// <summary>What one run did: started an issue, how many emails left, finished it, or found it missed.</summary>
public sealed record IssueTick(bool Started, int Delivered, bool Sent, bool Missed);

internal sealed class SendDueIssueHandler(IAppDbContext db, TimeProvider time, IBulkEmailSender sender, BulkEmailLimits limits, NewsletterEmails emails)
    : IRequestHandler<SendDueIssueCommand, IssueTick>
{
    /// <summary>The audit action of a send: the actor is the Admin who scheduled it (L2-070 AC13).</summary>
    public const string SentAction = "newsletter_issue.sent_by_scheduler";

    public async Task<IssueTick> Handle(SendDueIssueCommand request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var missed = false;
        var started = false;
        var due = await db.NewsletterIssues
            .Where(i => (i.Status == IssueStatus.Draft || i.Status == IssueStatus.Scheduled) && i.SendAt <= now)
            .OrderBy(i => i.Number)
            .FirstOrDefaultAsync(cancellationToken).ConfigureAwait(false);
        if (due is { Status: IssueStatus.Draft })
        {
            if (EventSchedule.TorontoOf(now).Date > EventSchedule.TorontoOf(due.SendAt).Date)
            {
                due.MoveTo(WeeklyIssue.NextAfter(now));
            }
            else if (!due.MissedSend)
            {
                due.MarkMissed();
                missed = true;
            }

            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
        else if (due is not null)
        {
            due.StartSending((await IssueCapture.ReadAsync(db, due, now, cancellationToken).ConfigureAwait(false)).ToJson());
            var subscribers = await db.NewsletterSubscriptions
                .Where(s => s.Status == SubscriptionStatus.Subscribed)
                .Select(s => s.Id)
                .ToListAsync(cancellationToken).ConfigureAwait(false);
            db.IssueDeliveries.AddRange(subscribers.Select(id => IssueDelivery.For(due.Id, id)));
            db.AuditEntries.Add(AuditEntry.Record(due.ScheduledById ?? Guid.Empty, SentAction, nameof(NewsletterIssue), due.Id, now));
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            started = true;
        }

        var sending = await db.NewsletterIssues.Where(i => i.Status == IssueStatus.Sending).OrderBy(i => i.Number)
            .FirstOrDefaultAsync(cancellationToken).ConfigureAwait(false);
        if (sending is null)
        {
            return new IssueTick(started, 0, false, missed);
        }

        var delivered = await DeliverAsync(sending, now, cancellationToken).ConfigureAwait(false);
        var waiting = await db.IssueDeliveries
            .AnyAsync(d => d.IssueId == sending.Id && d.SentAt == null && d.Attempts < IssueDelivery.MaxAttempts, cancellationToken).ConfigureAwait(false);
        if (waiting)
        {
            return new IssueTick(started, delivered, false, missed);
        }

        var all = await db.IssueDeliveries.Where(d => d.IssueId == sending.Id).ToListAsync(cancellationToken).ConfigureAwait(false);
        sending.Complete(now, all.Count(d => d.SentAt != null));
        db.IssueDeliveries.RemoveRange(all);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new IssueTick(started, delivered, true, missed);
    }

    /// <summary>Sends as many waiting deliveries as the relay's limits leave room for now; answers how many left.</summary>
    private async Task<int> DeliverAsync(NewsletterIssue issue, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (limits.MaxPerMinute is not { } perMinute || limits.MaxPerDay is not { } perDay)
        {
            return 0;
        }

        var minuteAgo = now.AddMinutes(-1);
        var dayAgo = now.AddDays(-1);
        var lastMinute = await db.IssueDeliveries.CountAsync(d => d.SentAt > minuteAgo, cancellationToken).ConfigureAwait(false);
        var lastDay = await db.IssueDeliveries.CountAsync(d => d.SentAt > dayAgo, cancellationToken).ConfigureAwait(false);
        var room = Math.Min(perMinute - lastMinute, perDay - lastDay);
        if (room <= 0)
        {
            return 0;
        }

        var batch = await db.IssueDeliveries
            .Where(d => d.IssueId == issue.Id && d.SentAt == null && d.Attempts < IssueDelivery.MaxAttempts)
            .OrderBy(d => d.Id)
            .Take(room)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        if (batch.Count == 0)
        {
            return 0;
        }

        var content = await IssueContents.OfAsync(db, issue, cancellationToken).ConfigureAwait(false);
        var ids = batch.Select(d => d.SubscriptionId).ToList();
        var subscriptions = await db.NewsletterSubscriptions.Where(s => ids.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, cancellationToken).ConfigureAwait(false);
        var addresses = subscriptions.Values.Select(s => s.Email).ToList();
        // The first name is read now, at send time, and kept nowhere (L2-070 AC7).
        var names = await db.Members.AsNoTracking()
            .Where(m => addresses.Contains(m.NormalizedEmail) && m.Status == MemberStatus.Active)
            .Select(m => new { m.NormalizedEmail, m.Name })
            .ToDictionaryAsync(m => m.NormalizedEmail, m => m.Name, cancellationToken).ConfigureAwait(false);
        var delivered = 0;
        foreach (var delivery in batch)
        {
            // An address that unsubscribed since sending started is sent nothing.
            if (!subscriptions.TryGetValue(delivery.SubscriptionId, out var subscription) || subscription.Status != SubscriptionStatus.Subscribed)
            {
                db.IssueDeliveries.Remove(delivery);
                continue;
            }

            var message = emails.Issue(subscription, IssueContents.FirstNameOf(names.GetValueOrDefault(subscription.Email)), content, now);
            try
            {
                await sender.SendAsync(message, cancellationToken).ConfigureAwait(false);
                delivery.MarkSent(now);
                delivered++;
            }
#pragma warning disable CA1031 // One address the relay refuses must not stop the issue; it is tried again, then given up.
            catch (Exception exception) when (exception is not OperationCanceledException)
#pragma warning restore CA1031
            {
                delivery.MarkFailed();
            }

            // Saved one by one: a restart resumes after the last email that left (ADR 0070).
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return delivered;
    }
}

/// <summary>Reads what an issue's email says from the stories and events it picks, as they are now.</summary>
internal static class IssueContents
{
    private static readonly CultureInfo Canada = CultureInfo.GetCultureInfo("en-CA");

    public static async Task<IssueEmailContent> OfAsync(IAppDbContext db, NewsletterIssue issue, CancellationToken cancellationToken) =>
        await OfAsync(db, new NewsletterIssue.Content(issue.Subject, issue.EditorsNote, issue.LeadStoryId, issue.AlsoStoryIds, issue.EventIds, issue.Verse, issue.VerseReference), cancellationToken).ConfigureAwait(false);

    public static async Task<IssueEmailContent> OfAsync(IAppDbContext db, NewsletterIssue.Content issue, CancellationToken cancellationToken)
    {
        var storyIds = issue.AlsoStoryIds.Append(issue.LeadStoryId ?? Guid.Empty).ToList();
        var stories = await db.Stories.AsNoTracking()
            .Where(s => storyIds.Contains(s.Id) && s.Status == Domain.News.StoryStatus.Published)
            .ToDictionaryAsync(s => s.Id, s => new IssueEmailStory(s.Headline, s.Summary, s.Slug ?? s.Id.ToString("D")), cancellationToken).ConfigureAwait(false);
        var eventIds = issue.EventIds.ToList();
        var events = await db.Events.AsNoTracking()
            .Where(e => eventIds.Contains(e.Id) && e.Status == EventStatus.Published)
            .OrderBy(e => e.StartsAt).ThenBy(e => e.Id)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        return new IssueEmailContent(
            issue.Subject,
            issue.EditorsNote,
            issue.LeadStoryId is { } lead ? stories.GetValueOrDefault(lead) : null,
            [.. issue.AlsoStoryIds.Where(stories.ContainsKey).Select(id => stories[id])],
            [.. events.Select(e => new IssueEmailEvent(e.Id, e.Title, When(e.StartsAt), e.Place))],
            issue.Verse,
            issue.VerseReference);
    }

    /// <summary>The first word of a member's name, or none.</summary>
    public static string? FirstNameOf(string? name) =>
        string.IsNullOrWhiteSpace(name) ? null : name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries)[0];

    private static string When(DateTimeOffset startsAt)
    {
        var (date, at) = EventSchedule.TorontoOf(startsAt);
        return $"{date.ToString("dddd, MMMM d", Canada)} at {at.ToString("h:mm tt", CultureInfo.InvariantCulture)}";
    }
}
