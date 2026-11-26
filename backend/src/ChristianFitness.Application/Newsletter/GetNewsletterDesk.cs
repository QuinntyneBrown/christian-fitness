using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.News;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Newsletter;
using ChristianFitness.Domain.News;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Newsletter;

/// <summary>
/// The Newsletter desk (L2-070 AC1): the newsletter's name, how many subscribers are confirmed,
/// when it goes out, and the next issue with its number and status. When no issue is unsent, the
/// next one is made as a Draft numbered one after the last, for the next send time.
/// </summary>
public sealed record GetNewsletterDeskQuery : IRequest<NewsletterDeskDto>;

public sealed record NewsletterDeskDto(
    string Name,
    int ConfirmedSubscribers,
    DateTimeOffset SendsAt,
    NextIssueDto NextIssue,
    IReadOnlyList<DeskStoryDto> Stories,
    IReadOnlyList<DeskEventDto> Events);

/// <summary>A published story the issue may carry, and whether staff marked it "Include in the Weekly" (L2-070 AC2, AC3).</summary>
public sealed record DeskStoryDto(Guid Id, string Headline, string? Section, DateTimeOffset PublishedAt, bool IncludeInWeekly);

/// <summary>One of the next four published upcoming events the issue may feature (L2-070 AC2).</summary>
public sealed record DeskEventDto(Guid Id, string Title, DateTimeOffset StartsAt);

/// <summary>The issue the screen builds: its number, <c>draft</c> or <c>scheduled</c>, and its send time.</summary>
public sealed record NextIssueDto(int Number, string Status, DateTimeOffset SendAt);

internal sealed class GetNewsletterDeskHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<GetNewsletterDeskQuery, NewsletterDeskDto>
{
    /// <summary>The newest published stories offered; an issue picks at most four of them.</summary>
    private const int StoryLimit = 50;

    /// <summary>The events offered to feature: the next four (L2-070 AC2).</summary>
    private const int EventLimit = 4;

    public async Task<NewsletterDeskDto> Handle(GetNewsletterDeskQuery request, CancellationToken cancellationToken)
    {
        var confirmed = await db.NewsletterSubscriptions.AsNoTracking()
            .CountAsync(s => s.Status == SubscriptionStatus.Subscribed, cancellationToken).ConfigureAwait(false);
        var next = await db.NewsletterIssues
            .Where(i => i.Status == IssueStatus.Draft || i.Status == IssueStatus.Scheduled)
            .OrderBy(i => i.Number)
            .FirstOrDefaultAsync(cancellationToken).ConfigureAwait(false);
        if (next is null)
        {
            var last = await db.NewsletterIssues.MaxAsync(i => (int?)i.Number, cancellationToken).ConfigureAwait(false) ?? 0;
            next = NewsletterIssue.CreateDraft(last + 1, WeeklyIssue.NextAfter(time.GetUtcNow()));
            db.NewsletterIssues.Add(next);
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }

        var now = time.GetUtcNow();
        var stories = await db.Stories.AsNoTracking()
            .Where(x => x.Status == StoryStatus.Published && x.PublishedAt != null)
            .OrderByDescending(x => x.PublishedAt).ThenBy(x => x.Id)
            .Take(StoryLimit)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        var events = await db.Events.AsNoTracking()
            .Where(e => e.Status == EventStatus.Published && e.StartsAt > now)
            .OrderBy(e => e.StartsAt).ThenBy(e => e.Id)
            .Take(EventLimit)
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        return new NewsletterDeskDto(
            NewsletterEmails.NewsletterName,
            confirmed,
            next.SendAt,
            new NextIssueDto(next.Number, next.Status.ToString().ToLowerInvariant(), next.SendAt),
            [.. stories.Select(x => new DeskStoryDto(x.Id, x.Headline, StoryNames.Of(x.Section), x.PublishedAt!.Value, x.IncludeInWeekly))],
            [.. events.Select(e => new DeskEventDto(e.Id, e.Title, e.StartsAt))]);
    }
}
