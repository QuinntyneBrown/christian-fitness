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
    public const int SubjectMaxLength = 150;

    public const int EditorsNoteMaxLength = 2000;

    public const int VerseMaxLength = 400;

    public const int VerseReferenceMaxLength = 60;

    /// <summary>"Also this week" holds at most three stories (L2-070 AC2).</summary>
    public const int AlsoStoriesMax = 3;

    /// <summary>"Events this week" chooses among the next four events (L2-070 AC2).</summary>
    public const int EventsMax = 4;

    private NewsletterIssue()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The issue's number, from 1, unique.</summary>
    public int Number { get; private set; }

    public IssueStatus Status { get; private set; }

    /// <summary>When the issue goes out.</summary>
    public DateTimeOffset SendAt { get; private set; }

    public string Subject { get; private set; } = string.Empty;

    public string EditorsNote { get; private set; } = string.Empty;

    /// <summary>"The big story": a published story, or none chosen yet.</summary>
    public Guid? LeadStoryId { get; private set; }

    /// <summary>"Also this week": at most <see cref="AlsoStoriesMax"/> more published stories, in the order ticked.</summary>
    public IReadOnlyList<Guid> AlsoStoryIds { get; private set; } = [];

    /// <summary>"Events this week": which of the next four events to feature.</summary>
    public IReadOnlyList<Guid> EventIds { get; private set; } = [];

    public string Verse { get; private set; } = string.Empty;

    public string VerseReference { get; private set; } = string.Empty;

    /// <summary>What an Admin writes and picks for an issue.</summary>
    public sealed record Content(
        string Subject,
        string EditorsNote,
        Guid? LeadStoryId,
        IReadOnlyList<Guid> AlsoStoryIds,
        IReadOnlyList<Guid> EventIds,
        string Verse,
        string VerseReference);

    /// <summary>Whether the issue's fields may still change: only a Draft's may (L2-070 AC6).</summary>
    public bool IsDraft => Status == IssueStatus.Draft;

    /// <summary>Replaces a Draft's fields; a Scheduled, Sending or Sent issue is locked and throws.</summary>
    public void Write(Content content)
    {
        ArgumentNullException.ThrowIfNull(content);
        if (!IsDraft)
        {
            throw new InvalidOperationException("Only a Draft issue can be edited.");
        }

        Subject = content.Subject;
        EditorsNote = content.EditorsNote;
        LeadStoryId = content.LeadStoryId;
        AlsoStoryIds = [.. content.AlsoStoryIds];
        EventIds = [.. content.EventIds];
        Verse = content.Verse;
        VerseReference = content.VerseReference;
    }

    /// <summary>The Admin who scheduled the issue; empty while it is a Draft (L2-070 AC13).</summary>
    public Guid? ScheduledById { get; private set; }

    /// <summary>Locks a Draft to go out at its time (L2-070 AC6); any other status throws.</summary>
    public void Schedule(Guid by)
    {
        if (!IsDraft)
        {
            throw new InvalidOperationException("Only a Draft issue can be scheduled.");
        }

        Status = IssueStatus.Scheduled;
        ScheduledById = by;
    }

    /// <summary>Whether "Unschedule to edit" applies: only until sending starts (L2-070 AC6).</summary>
    public bool CanUnschedule => Status == IssueStatus.Scheduled;

    /// <summary>Makes a Scheduled issue a Draft again; once sending has started it throws.</summary>
    public void Unschedule()
    {
        if (!CanUnschedule)
        {
            throw new InvalidOperationException("Only a Scheduled issue can be unscheduled.");
        }

        Status = IssueStatus.Draft;
        ScheduledById = null;
    }

    public static NewsletterIssue CreateDraft(int number, DateTimeOffset sendAt) =>
        new() { Id = Guid.NewGuid(), Number = number, Status = IssueStatus.Draft, SendAt = sendAt };
}
