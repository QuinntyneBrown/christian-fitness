namespace ChristianFitness.Domain.Events;

/// <summary>
/// One member's report of one message, group or direct, so staff can review its sender (L2-017; ADR
/// 0000). It records who reported which message and when, with an optional reason that is staff's to
/// read and is never logged. One reporter reports one message once.
/// </summary>
public sealed class MessageReport
{
    public const int ReasonMaxLength = 500;

    private MessageReport()
    {
    }

    public Guid Id { get; private set; }

    public Guid MessageId { get; private set; }

    public Guid ReporterId { get; private set; }

    /// <summary>The author of the message when it was reported.</summary>
    public Guid SenderId { get; private set; }

    /// <summary>The reporter's own words: trimmed, at most 500 characters, none when blank.</summary>
    public string? Reason { get; private set; }

    public DateTimeOffset ReportedAt { get; private set; }

    public static MessageReport Of(Guid messageId, Guid reporterId, Guid senderId, string? reason, DateTimeOffset reportedAt) => new()
    {
        Id = Guid.CreateVersion7(reportedAt),
        MessageId = messageId,
        ReporterId = reporterId,
        SenderId = senderId,
        Reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim(),
        ReportedAt = reportedAt,
    };
}
