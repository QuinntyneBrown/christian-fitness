namespace ChristianFitness.Domain.Newsletter;

/// <summary>
/// One confirmation link sent to a Pending address (L2-058 AC1; ADR 0110): single use and valid for
/// <see cref="Lifetime"/>. Only a hash of its token is stored; the token exists only in the email.
/// </summary>
public sealed class SubscriptionConfirmation
{
    /// <summary>How long a confirmation link works after it was sent (L2-058 AC1).</summary>
    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(7);

    private SubscriptionConfirmation()
    {
    }

    public Guid Id { get; private set; }

    public Guid SubscriptionId { get; private set; }

    /// <summary>The SHA-256 hash of the token, in lower-case hex.</summary>
    public string TokenHash { get; private set; } = string.Empty;

    public DateTimeOffset ExpiresAt { get; private set; }

    /// <summary>When the link was followed, or spent by another of the subscription's; empty while unused.</summary>
    public DateTimeOffset? UsedAt { get; private set; }

    /// <summary>Whether the link can still confirm at <paramref name="now"/>.</summary>
    public bool IsUsableAt(DateTimeOffset now) => UsedAt is null && now < ExpiresAt;

    /// <summary>Spends the link at <paramref name="now"/>: it never works again.</summary>
    public void Use(DateTimeOffset now) => UsedAt ??= now;

    /// <summary>A new confirmation for <paramref name="subscriptionId"/> and its token, sent at <paramref name="now"/>.</summary>
    public static (SubscriptionConfirmation Confirmation, string Token) Issue(Guid subscriptionId, DateTimeOffset now)
    {
        var token = NewsletterToken.Create();
        return (new SubscriptionConfirmation
        {
            Id = Guid.CreateVersion7(now),
            SubscriptionId = subscriptionId,
            TokenHash = NewsletterToken.HashOf(token),
            ExpiresAt = now + Lifetime,
        }, token);
    }
}

/// <summary>
/// One email's Unsubscribe token (L2-058 AC4, AC8; ADR 0078, ADR 0110): it never expires and needs
/// no Data Protection key. Only its hash is stored, and it goes with its subscription when that is
/// purged, after which the link finds nothing.
/// </summary>
public sealed class NewsletterUnsubscribeToken
{
    private NewsletterUnsubscribeToken()
    {
    }

    public Guid Id { get; private set; }

    public Guid SubscriptionId { get; private set; }

    /// <summary>The SHA-256 hash of the token, in lower-case hex.</summary>
    public string TokenHash { get; private set; } = string.Empty;

    public DateTimeOffset IssuedAt { get; private set; }

    /// <summary>A new Unsubscribe token for one email to <paramref name="subscriptionId"/>, and the token itself.</summary>
    public static (NewsletterUnsubscribeToken Stored, string Token) Issue(Guid subscriptionId, DateTimeOffset now)
    {
        var token = NewsletterToken.Create();
        return (new NewsletterUnsubscribeToken
        {
            Id = Guid.CreateVersion7(now),
            SubscriptionId = subscriptionId,
            TokenHash = NewsletterToken.HashOf(token),
            IssuedAt = now,
        }, token);
    }
}
