namespace ChristianFitness.Domain.Notifications;

/// <summary>What a notification is about: the four kinds that notify (ADR 0068, ADR 0083).</summary>
public enum NotificationKind
{
    /// <summary>24 hours before an event the member is going to.</summary>
    EventReminder,

    /// <summary>An event the member is registered for was cancelled.</summary>
    EventCancelled,

    /// <summary>A date was cancelled in a series the member joined.</summary>
    SeriesDateCancelled,

    /// <summary>A host the member follows posted new dates.</summary>
    FollowedHostDates,
}

/// <summary>
/// One entry of a member's in-app inbox (ADR 0068, ADR 0083): a plain-text title and line of detail,
/// the app-relative path it links to, when it was created and when the member read it. A notification
/// older than <see cref="Retention"/> is neither listed nor counted.
/// </summary>
public sealed class Notification
{
    /// <summary>The longest title, in characters.</summary>
    public const int TitleMaxLength = 120;

    /// <summary>The longest line of detail, in characters.</summary>
    public const int TextMaxLength = 300;

    /// <summary>The longest path a notification links to, in characters.</summary>
    public const int HrefMaxLength = 200;

    /// <summary>How long a notification is kept.</summary>
    public static readonly TimeSpan Retention = TimeSpan.FromDays(30);

    private Notification()
    {
    }

    public Guid Id { get; private set; }

    public Guid MemberId { get; private set; }

    public NotificationKind Kind { get; private set; }

    public string Title { get; private set; } = string.Empty;

    public string Text { get; private set; } = string.Empty;

    public string Href { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset? ReadAt { get; private set; }

    /// <summary>A new, unread notification for <paramref name="memberId"/> created at <paramref name="createdAt"/>.</summary>
    public static Notification Of(Guid memberId, NotificationKind kind, string title, string text, string href, DateTimeOffset createdAt) => new()
    {
        Id = Guid.CreateVersion7(createdAt),
        MemberId = memberId,
        Kind = kind,
        Title = title,
        Text = text,
        Href = href,
        CreatedAt = createdAt,
    };

    /// <summary>The instant before which, at <paramref name="now"/>, a notification has expired.</summary>
    public static DateTimeOffset KeptSince(DateTimeOffset now) => now - Retention;

    /// <summary>
    /// True for a path inside the app: it starts with one <c>/</c>, so it can be neither another site
    /// (<c>//host</c>, <c>https://host</c>) nor relative to wherever the inbox is.
    /// </summary>
    public static bool IsAppPath(string? href) =>
        href is { Length: > 1 and <= HrefMaxLength }
        && href[0] == '/'
        && href[1] != '/'
        && href[1] != '\\'
        && !href.Any(char.IsWhiteSpace);

    /// <summary>Marks the notification read at <paramref name="readAt"/>; a read one keeps its first instant.</summary>
    public void MarkRead(DateTimeOffset readAt) => ReadAt ??= readAt;
}
