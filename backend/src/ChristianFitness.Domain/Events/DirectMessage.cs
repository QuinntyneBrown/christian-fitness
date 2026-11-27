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

    /// <summary>Erases a message its erased sender wrote (L2-066 AC7; ADR 0078): no text, and a sender id that names nobody.</summary>
    public void EraseSent(Guid formerId)
    {
        SenderId = formerId;
        Text = string.Empty;
    }

    /// <summary>Detaches an erased recipient (ADR 0078): the message stays intact for its sender, written to an id that names nobody.</summary>
    public void DetachRecipient(Guid formerId) => RecipientId = formerId;
}
