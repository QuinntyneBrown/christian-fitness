using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Newsletter;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Newsletter;

/// <summary>
/// What a followed confirmation link answers (L2-058 AC2): the address now subscribed and when the
/// first issue arrives. A class, not a record, so the address is never printed by accident.
/// </summary>
public sealed class SubscriptionConfirmedDto(string email, DateTimeOffset firstIssueAt)
{
    public string Email { get; } = email;

    public DateTimeOffset FirstIssueAt { get; } = firstIssueAt;
}

/// <summary>A confirmation link's token, carried in the body, never in a URL (L2-058 AC7).</summary>
public sealed class ConfirmSubscriptionCommand : IRequest<SubscriptionConfirmedDto>
{
    public string Token { get; init; } = string.Empty;
}

/// <summary>
/// Confirms a subscription (L2-058 AC2, AC3; ADR 0110). An unknown, used or expired link is refused
/// 400 <c>subscription_link_expired</c> and changes nothing. A usable one subscribes the address,
/// records the time and source of consent, and spends every open link of the subscription.
/// </summary>
internal sealed class ConfirmSubscriptionHandler(IAppDbContext db, TimeProvider time)
    : IRequestHandler<ConfirmSubscriptionCommand, SubscriptionConfirmedDto>
{
    public async Task<SubscriptionConfirmedDto> Handle(ConfirmSubscriptionCommand request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var hash = NewsletterToken.HashOf(request.Token ?? string.Empty);
        var confirmation = await db.SubscriptionConfirmations
            .SingleOrDefaultAsync(c => c.TokenHash == hash, cancellationToken)
            .ConfigureAwait(false);
        if (confirmation is null || !confirmation.IsUsableAt(now))
        {
            throw new RefusalException(RefusalCodes.SubscriptionLinkExpired, RefusalKind.BadRequest);
        }

        var subscription = await db.NewsletterSubscriptions
            .SingleAsync(s => s.Id == confirmation.SubscriptionId, cancellationToken)
            .ConfigureAwait(false);
        subscription.Confirm(now);
        await SpendOpenLinksAsync(db, subscription.Id, now, cancellationToken).ConfigureAwait(false);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new SubscriptionConfirmedDto(subscription.Email, WeeklyIssue.NextAfter(now));
    }

    /// <summary>Marks every unused confirmation link of <paramref name="subscriptionId"/> used, for the caller's save.</summary>
    internal static async Task SpendOpenLinksAsync(IAppDbContext db, Guid subscriptionId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var open = await db.SubscriptionConfirmations
            .Where(c => c.SubscriptionId == subscriptionId && c.UsedAt == null)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        foreach (var link in open)
        {
            link.Use(now);
        }
    }
}
