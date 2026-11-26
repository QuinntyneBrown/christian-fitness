using System.Linq.Expressions;

namespace ChristianFitness.Domain.Newsletter;

/// <summary>An address's standing with The Abundant Weekly (L2-057, L2-058; ADR 0110).</summary>
public enum SubscriptionStatus
{
    /// <summary>Asked to subscribe and has not followed its confirmation link; nothing is sent to it.</summary>
    Pending,

    /// <summary>Confirmed: the Weekly is sent to it.</summary>
    Subscribed,

    /// <summary>Left by an Unsubscribe link: nothing is sent to it, and it is purged within 30 days.</summary>
    Unsubscribed,
}

/// <summary>
/// One email address's subscription to The Abundant Weekly (L2-057, L2-058; ADR 0110). The address
/// is stored only to send the newsletter. A class with no generated <c>ToString</c>, so the address
/// is never printed by accident (L2-033 AC2).
/// </summary>
public sealed class NewsletterSubscription
{
    /// <summary>The longest address kept, as at Join (ADR 0008).</summary>
    public const int EmailMaxLength = 254;

    /// <summary>What a confirmation link records as the source of consent (L2-058 AC2).</summary>
    public const string ConfirmationLinkSource = "Confirmation link";

    /// <summary>A never-confirmed request is purged this long after the most recent one (L2-058 AC9; ADR 0078).</summary>
    public static readonly TimeSpan PendingLifetime = TimeSpan.FromDays(30);

    /// <summary>
    /// An unsubscribed address is purged this long after it left: a day inside the 30 days of
    /// L2-058 AC6, for a scheduler that was down for a day (ADR 0110).
    /// </summary>
    public static readonly TimeSpan UnsubscribedLifetime = TimeSpan.FromDays(29);

    private NewsletterSubscription()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The address, trimmed and in lower case: the subscription's key.</summary>
    public string Email { get; private set; } = string.Empty;

    public SubscriptionStatus Status { get; private set; }

    /// <summary>When the address most recently asked to subscribe.</summary>
    public DateTimeOffset RequestedAt { get; private set; }

    /// <summary>When the owner followed a valid confirmation link; empty until then (L2-058 AC2).</summary>
    public DateTimeOffset? ConsentedAt { get; private set; }

    /// <summary>How consent was given (L2-058 AC2); empty until then.</summary>
    public string? ConsentSource { get; private set; }

    /// <summary>When the address unsubscribed; empty unless it is Unsubscribed (L2-058 AC5, AC6).</summary>
    public DateTimeOffset? UnsubscribedAt { get; private set; }

    /// <summary>The form an address is kept and found in: trimmed and in lower case.</summary>
    public static string Normalize(string email)
    {
        ArgumentNullException.ThrowIfNull(email);
#pragma warning disable CA1308 // A lookup key, not a comparison: email addresses are conventionally lower case.
        return email.Trim().ToLowerInvariant();
#pragma warning restore CA1308
    }

    /// <summary>A Pending subscription for <paramref name="email"/>, asked for at <paramref name="now"/>.</summary>
    public static NewsletterSubscription Request(string email, DateTimeOffset now) => new()
    {
        Id = Guid.CreateVersion7(now),
        Email = Normalize(email),
        Status = SubscriptionStatus.Pending,
        RequestedAt = now,
    };

    /// <summary>
    /// The address asked again at <paramref name="now"/>: a Pending or Unsubscribed subscription is
    /// Pending from now, so its purge starts again (ADR 0078); a Subscribed one does not change.
    /// Answers whether a confirmation is to be sent.
    /// </summary>
    public bool RequestAgain(DateTimeOffset now)
    {
        if (Status == SubscriptionStatus.Subscribed)
        {
            return false;
        }

        Status = SubscriptionStatus.Pending;
        RequestedAt = now;
        UnsubscribedAt = null;
        return true;
    }

    /// <summary>The owner followed a valid confirmation link at <paramref name="now"/> (L2-058 AC2).</summary>
    public void Confirm(DateTimeOffset now)
    {
        Status = SubscriptionStatus.Subscribed;
        ConsentedAt = now;
        ConsentSource = ConfirmationLinkSource;
        UnsubscribedAt = null;
    }

    /// <summary>
    /// The owner followed an Unsubscribe link at <paramref name="now"/> (L2-058 AC5): nothing more is
    /// sent. A second visit changes nothing, so it does not delay the purge.
    /// </summary>
    public void Unsubscribe(DateTimeOffset now)
    {
        if (Status == SubscriptionStatus.Unsubscribed)
        {
            return;
        }

        Status = SubscriptionStatus.Unsubscribed;
        UnsubscribedAt = now;
    }

    /// <summary>Whether scheduled work deletes this subscription at <paramref name="now"/> (L2-058 AC6, AC9).</summary>
    public bool IsPurgeableAt(DateTimeOffset now) => PurgeableAt(now).Compile()(this);

    /// <summary>
    /// The purge rule as a query the store runs (L2-058 AC6, AC9): Pending <see cref="PendingLifetime"/>
    /// after the most recent request, Unsubscribed <see cref="UnsubscribedLifetime"/> after it left.
    /// </summary>
    public static Expression<Func<NewsletterSubscription, bool>> PurgeableAt(DateTimeOffset now)
    {
        var pendingBefore = now - PendingLifetime;
        var unsubscribedBefore = now - UnsubscribedLifetime;
        return s => (s.Status == SubscriptionStatus.Pending && s.RequestedAt <= pendingBefore)
            || (s.Status == SubscriptionStatus.Unsubscribed && s.UnsubscribedAt <= unsubscribedBefore);
    }
}
