namespace ChristianFitness.Domain.Newsletter;

/// <summary>Where an issue of The Abundant Weekly stands (L2-070 AC1, AC6, AC7).</summary>
public enum IssueStatus
{
    Draft,
    Scheduled,
    Sending,
    Sent,
}

/// <summary>
/// One numbered issue of The Abundant Weekly (L2-070; journey 28). The next issue is the one not
/// yet sent: the desk makes Draft number <c>n + 1</c> when none exists.
/// </summary>
public sealed class NewsletterIssue
{
    private NewsletterIssue()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The issue's number, from 1, unique.</summary>
    public int Number { get; private set; }

    public IssueStatus Status { get; private set; }

    /// <summary>When the issue goes out.</summary>
    public DateTimeOffset SendAt { get; private set; }

    public static NewsletterIssue CreateDraft(int number, DateTimeOffset sendAt) =>
        new() { Id = Guid.NewGuid(), Number = number, Status = IssueStatus.Draft, SendAt = sendAt };
}
