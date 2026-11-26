namespace ChristianFitness.Domain.Events;

/// <summary>
/// How far one member has read one conversation (L2-016 AC7; ADR 0042): the instant they last opened
/// it. A message sent by someone else after <see cref="ReadAt"/> is unread. There is at most one per
/// member and conversation, keyed by the conversation's id: an event's or a series' chat (ADR 0101),
/// or the other member of a direct conversation (ADR 0043).
/// </summary>
public sealed class ChatReadMarker
{
    private ChatReadMarker()
    {
    }

    public Guid MemberId { get; private set; }

    /// <summary>The id of the event, the series or the other member whose conversation it is.</summary>
    public Guid ScopeId { get; private set; }

    public DateTimeOffset ReadAt { get; private set; }

    /// <summary>A marker for <paramref name="memberId"/> in the conversation <paramref name="scopeId"/>, read up to <paramref name="readAt"/>.</summary>
    public static ChatReadMarker Of(Guid memberId, Guid scopeId, DateTimeOffset readAt) => new()
    {
        MemberId = memberId,
        ScopeId = scopeId,
        ReadAt = readAt,
    };

    /// <summary>Moves the marker to <paramref name="readAt"/>; it never moves back.</summary>
    public void ReadUpTo(DateTimeOffset readAt)
    {
        if (readAt > ReadAt)
        {
            ReadAt = readAt;
        }
    }
}
