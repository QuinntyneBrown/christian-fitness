using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Newsletter;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Newsletter;

/// <summary>Deletes the subscriptions no rule lets the store keep any longer; answers how many.</summary>
public sealed record PurgeNewsletterSubscriptionsCommand : IRequest<int>;

/// <summary>
/// The newsletter's retention (L2-058 AC6, AC9; ADR 0078, ADR 0110), run by the publishing clock: a
/// Pending subscription 30 days after its most recent request and an Unsubscribed one 29 days after
/// it left are deleted, with their confirmation links and Unsubscribe tokens, so an old link names
/// nothing afterwards. The two reads use the status-and-time indexes; most ticks delete nothing.
/// </summary>
internal sealed class PurgeNewsletterSubscriptionsHandler(IAppDbContext db, TimeProvider time)
    : IRequestHandler<PurgeNewsletterSubscriptionsCommand, int>
{
    public async Task<int> Handle(PurgeNewsletterSubscriptionsCommand request, CancellationToken cancellationToken)
    {
        var due = await db.NewsletterSubscriptions
            .Where(NewsletterSubscription.PurgeableAt(time.GetUtcNow()))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        if (due.Count == 0)
        {
            return 0;
        }

        // The database cascades, but InMemory cascades only tracked rows: delete the links too.
        var ids = due.Select(s => s.Id).ToList();
        db.SubscriptionConfirmations.RemoveRange(await db.SubscriptionConfirmations.Where(c => ids.Contains(c.SubscriptionId)).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.NewsletterUnsubscribeTokens.RemoveRange(await db.NewsletterUnsubscribeTokens.Where(t => ids.Contains(t.SubscriptionId)).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.NewsletterSubscriptions.RemoveRange(due);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return due.Count;
    }
}
