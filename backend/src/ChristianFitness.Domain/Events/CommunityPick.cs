namespace ChristianFitness.Domain.Events;

/// <summary>
/// One Community Pick (L2-072 AC13; ADR 0098): a published event staff promoted, the one-line note
/// on why, who made it and when. The graphics and captions are made in the browser and never
/// stored; the pick is kept so Community Pick can say when an event was last picked.
/// </summary>
public sealed class CommunityPick
{
    /// <summary>The longest note, in characters: it goes on every graphic and caption (L2-072 AC2).</summary>
    public const int NoteMaxLength = 70;

    private CommunityPick()
    {
    }

    public Guid Id { get; private set; }

    public Guid EventId { get; private set; }

    /// <summary>Why it is a pick, trimmed; empty when staff wrote none.</summary>
    public string Note { get; private set; } = string.Empty;

    /// <summary>The staff member who made it.</summary>
    public Guid PickedById { get; private set; }

    public DateTimeOffset PickedAt { get; private set; }

    /// <summary>A pick of <paramref name="eventId"/>; the handler has checked the event and the note's length.</summary>
    public static CommunityPick Record(Guid eventId, string note, Guid pickedById, DateTimeOffset pickedAt)
    {
        ArgumentNullException.ThrowIfNull(note);
        return new CommunityPick
        {
            Id = Guid.CreateVersion7(pickedAt),
            EventId = eventId,
            Note = note.Trim(),
            PickedById = pickedById,
            PickedAt = pickedAt,
        };
    }
}
