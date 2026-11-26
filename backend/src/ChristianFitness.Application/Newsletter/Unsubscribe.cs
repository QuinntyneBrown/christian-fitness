using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Newsletter;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Newsletter;

/// <summary>
/// What a followed Unsubscribe link answers (L2-058 AC5): the address, or none for a token that names
/// nothing, such as one whose subscription was purged. A class, so the address is never printed by accident.
/// </summary>
public sealed class UnsubscribedDto(string? email)
{
    public string? Email { get; } = email;
}

/// <summary>An Unsubscribe link's token, from Subscribe's body or the one-click address (L2-058 AC5).</summary>
public sealed class UnsubscribeCommand : IRequest<UnsubscribedDto>
{
    public string Token { get; init; } = string.Empty;
}

/// <summary>
/// Unsubscribes the address an Unsubscribe token names, from the Weekly and every extra at once,
/// without signing in (L2-058 AC5, AC8, AC10; ADR 0078, ADR 0110). The token is looked up by its hash,
/// never expires and needs no Data Protection key. A second visit answers the same and changes
/// nothing; a token that names nothing is a no-op answering no address. Any open confirmation link
/// is spent, so an older email cannot subscribe the address again.
/// </summary>
internal sealed class UnsubscribeHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<UnsubscribeCommand, UnsubscribedDto>
{
    public async Task<UnsubscribedDto> Handle(UnsubscribeCommand request, CancellationToken cancellationToken)
    {
        var hash = NewsletterToken.HashOf(request.Token ?? string.Empty);
        var subscriptionId = await db.NewsletterUnsubscribeTokens
            .Where(t => t.TokenHash == hash)
            .Select(t => (Guid?)t.SubscriptionId)
            .SingleOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);
        var subscription = subscriptionId is null
            ? null
            : await db.NewsletterSubscriptions.SingleOrDefaultAsync(s => s.Id == subscriptionId, cancellationToken).ConfigureAwait(false);
        if (subscription is null)
        {
            return new UnsubscribedDto(null);
        }

        var now = time.GetUtcNow();
        subscription.Unsubscribe(now);
        await ConfirmSubscriptionHandler.SpendOpenLinksAsync(db, subscription.Id, now, cancellationToken).ConfigureAwait(false);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new UnsubscribedDto(subscription.Email);
    }
}
