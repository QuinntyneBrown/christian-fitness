using ChristianFitness.Domain.Members;

namespace ChristianFitness.Domain.Feedback;

/// <summary>
/// One piece of feedback a member sent (L2-063; ADR 0109): its kind, text, the page or story it is
/// about, the member, the time, the OS family and the browser family and major version, whether the
/// team may email them, and at most one screenshot's key. Only staff read it (L2-074). The text and
/// the page's title are never logged (L2-033 AC2).
/// </summary>
public sealed class FeedbackNote
{
    public const int TextMaxLength = 2000;
    public const int RouteTemplateMaxLength = 80;
    public const int PageTitleMaxLength = 300;
    public const int DeviceMaxLength = 40;
    public const int ScreenshotKeyMaxLength = 40;

    /// <summary>At most 10 notes from one member in a rolling hour (L2-063 AC9).</summary>
    public static readonly AttemptWindow SendWindow = new(10, TimeSpan.FromHours(1));

    private FeedbackNote()
    {
    }

    public Guid Id { get; private set; }

    public Guid MemberId { get; private set; }

    public FeedbackKind Kind { get; private set; }

    /// <summary>The note, trimmed; plain text, never rendered as HTML.</summary>
    public string Text { get; private set; } = string.Empty;

    /// <summary>The member route template the note is about, such as <c>events/:id</c>; none for a story or no page.</summary>
    public string? PageRouteTemplate { get; private set; }

    /// <summary>The story the note is about; none otherwise.</summary>
    public Guid? StoryId { get; private set; }

    /// <summary>The "About this page" label as the server gave it, such as "Story › headline"; none when no page.</summary>
    public string? PageTitle { get; private set; }

    /// <summary>Whether the team may email the member about it (L2-063 AC3, AC11).</summary>
    public bool MayEmail { get; private set; }

    /// <summary>The OS family, such as "iOS"; nothing finer (L2-063 AC6).</summary>
    public string Device { get; private set; } = string.Empty;

    /// <summary>The browser family and major version, such as "Safari 18"; nothing finer (L2-063 AC6).</summary>
    public string Browser { get; private set; } = string.Empty;

    /// <summary>The key of the screenshot in the private store; none without one.</summary>
    public string? ScreenshotKey { get; private set; }

    public FeedbackStatus Status { get; private set; }

    public DateTimeOffset SentAt { get; private set; }

    /// <summary>A New note from <paramref name="memberId"/>, sent at <paramref name="sentAt"/>, its text trimmed.</summary>
    public static FeedbackNote Send(
        Guid memberId,
        FeedbackKind kind,
        string text,
        string? pageRouteTemplate,
        Guid? storyId,
        string? pageTitle,
        bool mayEmail,
        string device,
        string browser,
        string? screenshotKey,
        DateTimeOffset sentAt)
    {
        ArgumentNullException.ThrowIfNull(text);
        ArgumentNullException.ThrowIfNull(device);
        ArgumentNullException.ThrowIfNull(browser);
        return new FeedbackNote
        {
            Id = Guid.CreateVersion7(sentAt),
            MemberId = memberId,
            Kind = kind,
            Text = text.Trim(),
            PageRouteTemplate = pageRouteTemplate,
            StoryId = storyId,
            PageTitle = pageTitle,
            MayEmail = mayEmail,
            Device = device,
            Browser = browser,
            ScreenshotKey = screenshotKey,
            Status = FeedbackStatus.New,
            SentAt = sentAt,
        };
    }

    /// <summary>When staff last replied; empty until then (L2-074 AC5).</summary>
    public DateTimeOffset? RepliedAt { get; private set; }

    /// <summary>When staff marked it resolved; empty unless it is Resolved (L2-074 AC6).</summary>
    public DateTimeOffset? ResolvedAt { get; private set; }

    /// <summary>A reply has gone to the member: the note is Replied (L2-074 AC5).</summary>
    public void MarkReplied(DateTimeOffset now)
    {
        Status = FeedbackStatus.Replied;
        RepliedAt = now;
        ResolvedAt = null;
    }

    /// <summary>Whether Mark resolved applies: to a note that is not Resolved (L2-074 AC6).</summary>
    public bool CanResolve => Status != FeedbackStatus.Resolved;

    /// <summary>Marks the note Resolved; one already Resolved throws.</summary>
    public void Resolve(DateTimeOffset now)
    {
        if (!CanResolve)
        {
            throw new InvalidOperationException("The note is already resolved.");
        }

        Status = FeedbackStatus.Resolved;
        ResolvedAt = now;
    }

    /// <summary>Reopen makes a Resolved note New again (L2-074 AC6); any other status throws.</summary>
    public void Reopen()
    {
        if (CanResolve)
        {
            throw new InvalidOperationException("Only a resolved note is reopened.");
        }

        Status = FeedbackStatus.New;
        ResolvedAt = null;
    }
}
