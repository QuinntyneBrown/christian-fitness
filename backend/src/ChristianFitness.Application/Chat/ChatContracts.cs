namespace ChristianFitness.Application.Chat;

/// <summary>
/// What the hub answers to a join or a send (slice 12.1; ADR 0039): a refusal is an answer with a
/// <see cref="Code"/>, never an exception, since SignalR hides an exception's message. A join that
/// succeeds names the chat and the caller; a send that succeeds answers nothing more.
/// </summary>
public sealed record ChatAnswer(string? Code, string? Title, Guid? MemberId)
{
    /// <summary>
    /// True when a direct conversation is with the Christian Fitness account, which takes no replies
    /// (L2-014 AC8; ADR 0065); omitted otherwise.
    /// </summary>
    [global::System.Text.Json.Serialization.JsonIgnore(Condition = global::System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    public bool? System { get; init; }

    public static ChatAnswer Ok { get; } = new(null, null, null);

    public static ChatAnswer Refused(string code) => new(code, null, null);
}

/// <summary>One message as the chat's members receive it. The text is plain text, never markup.</summary>
public sealed record ChatMessageDto(Guid Id, Guid EventId, Guid AuthorId, string Author, string Text, DateTimeOffset SentAt);

/// <summary>Where a chat's connections and messages go; the API implements it over its hub (ADR 0039).</summary>
public interface IChatChannel
{
    /// <summary>Lets the connection receive the event's messages from now on.</summary>
    Task JoinAsync(string connectionId, Guid memberId, Guid eventId, CancellationToken cancellationToken);

    /// <summary>Takes every connection of the member out of the event's chat (slice 12.3; ADR 0041).</summary>
    Task LeaveAsync(Guid memberId, Guid eventId, CancellationToken cancellationToken);

    /// <summary>Tells every connection in the event's chat that the event was cancelled.</summary>
    Task NotifyCancelledAsync(Guid eventId, CancellationToken cancellationToken);

    /// <summary>Forgets a connection that closed.</summary>
    void Disconnected(string connectionId);

    /// <summary>Delivers the message to every connection that joined its event's chat.</summary>
    Task SendAsync(ChatMessageDto message, CancellationToken cancellationToken);

    /// <summary>
    /// Delivers a direct message to every connection of one member (slice 14.1; ADR 0043). Its
    /// <c>EventId</c> carries the other member's id, so each side keys the conversation by the other.
    /// </summary>
    Task SendToMemberAsync(Guid memberId, ChatMessageDto message, CancellationToken cancellationToken);
}
