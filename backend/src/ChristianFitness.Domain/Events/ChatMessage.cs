namespace ChristianFitness.Domain.Events;

/// <summary>
/// One message of an event's group chat, stored so a member can read what came before (L2-016 AC6;
/// ADR 0040). The text is plain text. Messages are read in order of <see cref="SentAt"/>, then
/// <see cref="Id"/>; a page of history is cut at an instant, and the clock's ticks (100 ns) keep two
/// messages from sharing one.
/// </summary>
public sealed class ChatMessage
{
    private ChatMessage()
    {
    }

    public Guid Id { get; private set; }

    public Guid EventId { get; private set; }

    public Guid AuthorId { get; private set; }

    public string Text { get; private set; } = string.Empty;

    public DateTimeOffset SentAt { get; private set; }

    /// <summary><paramref name="authorId"/>'s message to the event's chat, sent at <paramref name="sentAt"/>.</summary>
    public static ChatMessage Of(Guid eventId, Guid authorId, string text, DateTimeOffset sentAt) => new()
    {
        Id = Guid.CreateVersion7(sentAt),
        EventId = eventId,
        AuthorId = authorId,
        Text = text,
        SentAt = sentAt,
    };
}
