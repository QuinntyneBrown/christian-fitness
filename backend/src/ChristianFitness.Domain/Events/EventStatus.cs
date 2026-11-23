namespace ChristianFitness.Domain.Events;

/// <summary>Where an event is in its life (L2-022, L2-023).</summary>
public enum EventStatus
{
    /// <summary>Saved by staff, hidden from members (L2-022 AC1).</summary>
    Draft,

    /// <summary>Visible to members (L2-023 AC1, slice 11.1).</summary>
    Published,

    /// <summary>Withdrawn by staff after it was published; hidden from lists, kept on registered members' Profile (L2-023 AC2, slice 11.2).</summary>
    Cancelled,
}
