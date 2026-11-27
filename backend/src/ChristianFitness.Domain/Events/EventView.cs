namespace ChristianFitness.Domain.Events;

/// <summary>
/// That a member has opened an event's page, and when they first did (L2-056 AC7; ADR 0116). Once
/// seen, a followed listing's event is no longer new to them on Home. Keyed by the pair, so a
/// second opening adds nothing.
/// </summary>
public sealed class EventView
{
    private EventView()
    {
    }

    public Guid MemberId { get; private set; }

    public Guid EventId { get; private set; }

    /// <summary>When the member first opened the event.</summary>
    public DateTimeOffset SeenAt { get; private set; }

    /// <summary><paramref name="memberId"/> opened <paramref name="eventId"/> at <paramref name="at"/>.</summary>
    public static EventView Of(Guid memberId, Guid eventId, DateTimeOffset at) =>
        new() { MemberId = memberId, EventId = eventId, SeenAt = at };
}
