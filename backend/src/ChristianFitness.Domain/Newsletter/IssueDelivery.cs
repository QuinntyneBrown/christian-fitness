namespace ChristianFitness.Domain.Newsletter;

/// <summary>
/// One recipient of an issue being sent (L2-070 AC7; ADR 0070): the durable queue the sender works
/// through within the relay's limits. The rows are deleted when the issue is Sent, which leaves no
/// record of who was sent an issue.
/// </summary>
public sealed class IssueDelivery
{
    /// <summary>A delivery that failed this many times is given up.</summary>
    public const int MaxAttempts = 3;

    private IssueDelivery()
    {
    }

    public Guid Id { get; private set; }

    public Guid IssueId { get; private set; }

    public Guid SubscriptionId { get; private set; }

    /// <summary>When the email was handed to the relay; empty while it waits.</summary>
    public DateTimeOffset? SentAt { get; private set; }

    public int Attempts { get; private set; }

    /// <summary>Waiting to be sent: not sent, and not given up.</summary>
    public bool IsPending => SentAt is null && Attempts < MaxAttempts;

    public static IssueDelivery For(Guid issueId, Guid subscriptionId) =>
        new() { Id = Guid.CreateVersion7(), IssueId = issueId, SubscriptionId = subscriptionId };

    public void MarkSent(DateTimeOffset at) => SentAt = at;

    public void MarkFailed() => Attempts++;
}
