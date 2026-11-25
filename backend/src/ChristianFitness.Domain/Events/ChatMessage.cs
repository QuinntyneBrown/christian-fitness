namespace ChristianFitness.Domain.Events;

/// <summary>
/// One message of a group chat, stored so a member can read what came before (L2-016 AC6; ADR
/// 0040). It belongs to a conversation scope: a standalone event's chat or a series' one chat (ADR
/// 0080, ADR 0099). The text is plain text. Messages are read in order of <see cref="SentAt"/>, then
/// <see cref="Id"/>; a page of history is cut at an instant, and the clock's ticks (100 ns) keep two
/// messages from sharing one.
/// </summary>
public sealed class ChatMessage
{
    private ChatMessage()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>Whether the chat is an event's or a series' (ADR 0099).</summary>
    public ChatScopeKind ScopeKind { get; private set; }

    /// <summary>The id of the event or the series whose chat it is.</summary>
    public Guid ScopeId { get; private set; }

    public Guid AuthorId { get; private set; }

    public string Text { get; private set; } = string.Empty;

    public DateTimeOffset SentAt { get; private set; }

    /// <summary><paramref name="authorId"/>'s message to the chat of <paramref name="scope"/>, sent at <paramref name="sentAt"/>.</summary>
    public static ChatMessage Of(ChatScope scope, Guid authorId, string text, DateTimeOffset sentAt) => new()
    {
        Id = Guid.CreateVersion7(sentAt),
        ScopeKind = scope.Kind,
        ScopeId = scope.Id,
        AuthorId = authorId,
        Text = text,
        SentAt = sentAt,
    };
}
