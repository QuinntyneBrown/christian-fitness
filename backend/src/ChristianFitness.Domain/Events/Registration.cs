namespace ChristianFitness.Domain.Events;

/// <summary>How a registration holds its place (L2-011 AC1, AC5; ADR 0032).</summary>
public enum RegistrationStatus
{
    /// <summary>A free event's place, held outright.</summary>
    Confirmed,

    /// <summary>A paid event's place, held until payment is made outside the system.</summary>
    Reserved,
}

/// <summary>One member's place at one event; there is at most one per pair (L2-011 AC4; ADR 0032).</summary>
public sealed class Registration
{
    private Registration()
    {
    }

    public Guid Id { get; private set; }

    public Guid EventId { get; private set; }

    public Guid MemberId { get; private set; }

    public RegistrationStatus Status { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>A place at <paramref name="eventId"/>, reserved when the event is paid.</summary>
    public static Registration Of(Guid eventId, Guid memberId, int eventPriceCents, DateTimeOffset createdAt) => new()
    {
        Id = Guid.CreateVersion7(createdAt),
        EventId = eventId,
        MemberId = memberId,
        Status = eventPriceCents > 0 ? RegistrationStatus.Reserved : RegistrationStatus.Confirmed,
        CreatedAt = createdAt,
    };
}
