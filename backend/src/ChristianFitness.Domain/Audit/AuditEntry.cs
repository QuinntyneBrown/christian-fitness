namespace ChristianFitness.Domain.Audit;

/// <summary>
/// One staff change that succeeded (L2-019 AC3; ADR 0021): who made it (the staff member's id), what
/// it was (a stable action name such as <c>staff_session.started</c>), which record it changed (its
/// type and id) and when. Nothing else is kept: no name, email, field value or request text. An
/// entry is never changed or deleted, and outlives the member it names.
/// </summary>
public sealed class AuditEntry
{
    /// <summary>The longest action or record type name kept.</summary>
    public const int NameLength = 64;

    private AuditEntry()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The staff member who made the change.</summary>
    public Guid ActorMemberId { get; private set; }

    /// <summary>What was done, such as <c>staff_session.started</c> or <c>event.created</c>.</summary>
    public string Action { get; private set; } = string.Empty;

    /// <summary>The kind of record changed, such as <c>StaffSession</c> or <c>Event</c>.</summary>
    public string RecordType { get; private set; } = string.Empty;

    /// <summary>The id of the record changed.</summary>
    public Guid RecordId { get; private set; }

    public DateTimeOffset OccurredAt { get; private set; }

    public static AuditEntry Record(Guid actorMemberId, string action, string recordType, Guid recordId, DateTimeOffset occurredAt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(action);
        ArgumentException.ThrowIfNullOrWhiteSpace(recordType);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(action.Length, NameLength, nameof(action));
        ArgumentOutOfRangeException.ThrowIfGreaterThan(recordType.Length, NameLength, nameof(recordType));
        return new AuditEntry
        {
            Id = Guid.CreateVersion7(occurredAt),
            ActorMemberId = actorMemberId,
            Action = action,
            RecordType = recordType,
            RecordId = recordId,
            OccurredAt = occurredAt,
        };
    }
}
