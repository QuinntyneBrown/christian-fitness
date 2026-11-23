namespace ChristianFitness.Domain.Events;

/// <summary>
/// How far one member has read one event's group chat (L2-016 AC7; ADR 0042): the instant they last
/// opened it. A message sent by someone else after <see cref="ReadAt"/> is unread. There is at most
/// one per member and event.
/// </summary>
public sealed class ChatReadMarker
{
    private ChatReadMarker()
    {
    }

    public Guid MemberId { get; private set; }

    public Guid EventId { get; private set; }

    public DateTimeOffset ReadAt { get; private set; }

    /// <summary>A marker for <paramref name="memberId"/> in the event's chat, read up to <paramref name="readAt"/>.</summary>
    public static ChatReadMarker Of(Guid memberId, Guid eventId, DateTimeOffset readAt) => new()
    {
        MemberId = memberId,
        EventId = eventId,
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
