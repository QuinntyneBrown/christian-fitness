namespace ChristianFitness.Domain.Feedback;

/// <summary>
/// A staff reply kept with its note and shown in the inbox thread (L2-074 AC5). It is deleted with
/// the note, and so erased with the member who sent the note. A class with no generated
/// <c>ToString</c>, so its text is never printed by accident.
/// </summary>
public sealed class FeedbackReply
{
    public const int TextMaxLength = 2000;

    private FeedbackReply()
    {
    }

    public Guid Id { get; private set; }

    public Guid NoteId { get; private set; }

    /// <summary>The staff member who wrote it.</summary>
    public Guid StaffId { get; private set; }

    public string Text { get; private set; } = string.Empty;

    public DateTimeOffset SentAt { get; private set; }

    public static FeedbackReply To(Guid noteId, Guid staffId, string text, DateTimeOffset sentAt)
    {
        ArgumentNullException.ThrowIfNull(text);
        return new FeedbackReply { Id = Guid.CreateVersion7(sentAt), NoteId = noteId, StaffId = staffId, Text = text.Trim(), SentAt = sentAt };
    }
}
