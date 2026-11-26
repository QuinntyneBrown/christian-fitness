using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Newsletter;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Newsletter;

/// <summary>
/// The Newsletter desk (L2-070 AC1): the newsletter's name, how many subscribers are confirmed,
/// when it goes out, and the next issue with its number and status. When no issue is unsent, the
/// next one is made as a Draft numbered one after the last, for the next send time.
/// </summary>
public sealed record GetNewsletterDeskQuery : IRequest<NewsletterDeskDto>;

public sealed record NewsletterDeskDto(string Name, int ConfirmedSubscribers, DateTimeOffset SendsAt, NextIssueDto NextIssue);

/// <summary>The issue the screen builds: its number, <c>draft</c> or <c>scheduled</c>, and its send time.</summary>
public sealed record NextIssueDto(int Number, string Status, DateTimeOffset SendAt);

internal sealed class GetNewsletterDeskHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<GetNewsletterDeskQuery, NewsletterDeskDto>
{
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

        return new NewsletterDeskDto(
            NewsletterEmails.NewsletterName,
            confirmed,
            next.SendAt,
            new NextIssueDto(next.Number, next.Status.ToString().ToLowerInvariant(), next.SendAt));
    }
}
