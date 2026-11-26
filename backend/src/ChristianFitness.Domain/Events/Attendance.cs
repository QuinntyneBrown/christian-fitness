namespace ChristianFitness.Domain.Events;

/// <summary>
/// Whether one registered member came to one event, as staff recorded it, and who recorded it when
/// (L2-080 AC4; ADR 0106). At most one per pair; a row, ticked or cleared, makes the event's
/// attendance recorded for that member, which their series page reads as "You came" or "Missed".
/// </summary>
public sealed class Attendance
{
    private Attendance()
    {
    }

    public Guid Id { get; private set; }

    public Guid EventId { get; private set; }

    public Guid MemberId { get; private set; }

    public bool Came { get; private set; }

    /// <summary>The staff member who saved the latest change.</summary>
    public Guid RecordedBy { get; private set; }

    public DateTimeOffset RecordedAt { get; private set; }

    /// <summary>The first record of whether <paramref name="memberId"/> came to <paramref name="eventId"/>.</summary>
    public static Attendance Of(Guid eventId, Guid memberId, bool came, Guid recordedBy, DateTimeOffset recordedAt) => new()
    {
        Id = Guid.CreateVersion7(recordedAt),
        EventId = eventId,
        MemberId = memberId,
        Came = came,
        RecordedBy = recordedBy,
        RecordedAt = recordedAt,
    };

    /// <summary>Records <paramref name="came"/> again, by <paramref name="recordedBy"/>.</summary>
    public void Record(bool came, Guid recordedBy, DateTimeOffset recordedAt)
    {
        Came = came;
        RecordedBy = recordedBy;
        RecordedAt = recordedAt;
    }
}

/// <summary>When staff may record attendance (L2-080 AC5; ADR 0106).</summary>
public static class AttendanceRules
{
    /// <summary>An event has started once its start is not after <paramref name="now"/>.</summary>
    public static bool HasStarted(Event e, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(e);
        return e.StartsAt <= now;
    }
}
