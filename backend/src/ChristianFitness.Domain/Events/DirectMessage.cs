namespace ChristianFitness.Domain.Events;

/// <summary>
/// One message of a private conversation between two members, stored so either can read what came
/// before (L2-016; ADR 0043). The text is plain text. A conversation is described by the pair, not stored.
/// </summary>
public sealed class DirectMessage
{
    private DirectMessage()
    {
    }

    public Guid Id { get; private set; }

    public Guid SenderId { get; private set; }

    public Guid RecipientId { get; private set; }

    public string Text { get; private set; } = string.Empty;

    public DateTimeOffset SentAt { get; private set; }

    /// <summary><paramref name="senderId"/>'s message to <paramref name="recipientId"/>, sent at <paramref name="sentAt"/>.</summary>
    public static DirectMessage Of(Guid senderId, Guid recipientId, string text, DateTimeOffset sentAt) => new()
    {
        Id = Guid.CreateVersion7(sentAt),
        SenderId = senderId,
        RecipientId = recipientId,
        Text = text,
        SentAt = sentAt,
    };
}
