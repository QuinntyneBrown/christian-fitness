using System.Globalization;
using ChristianFitness.Application.Chat;
using MediatR;
using Microsoft.AspNetCore.SignalR;

namespace ChristianFitness.Api.Chat;

/// <summary>
/// The event group chat's hub at <see cref="Path"/> (L2-016; slice 12.1; ADR 0039). A method checks
/// nothing: it sends one MediatR request and returns the handler's answer, which carries a refusal
/// as a <c>code</c>. The session cookie authenticates the connection through the fallback policy.
/// </summary>
public sealed class ChatHub(ISender sender) : Hub
{
    public const string Path = "/api/chat";

    /// <summary>Joins the event's chat on this connection.</summary>
    public Task<ChatAnswer> Join(Guid eventId) =>
        sender.Send(new JoinChatCommand(Caller, eventId, Context.ConnectionId), Context.ConnectionAborted);

    /// <summary>Sends a message to the event's chat.</summary>
    public Task<ChatAnswer> Send(Guid eventId, string? text) =>
        sender.Send(new SendChatMessageCommand(Caller, eventId, text), Context.ConnectionAborted);

    private Guid Caller => Guid.Parse(Context.UserIdentifier!, CultureInfo.InvariantCulture);
}

/// <summary>Delivers a chat's messages through <see cref="ChatHub"/>'s groups, one group per event.</summary>
internal sealed class HubChatChannel(IHubContext<ChatHub> hub) : IChatChannel
{
    private static string GroupOf(Guid eventId) => $"event-chat:{eventId}";

    public Task JoinAsync(string connectionId, Guid eventId, CancellationToken cancellationToken) =>
        hub.Groups.AddToGroupAsync(connectionId, GroupOf(eventId), cancellationToken);

    public Task SendAsync(ChatMessageDto message, CancellationToken cancellationToken) =>
        hub.Clients.Group(GroupOf(message.EventId)).SendAsync("MessageReceived", message, cancellationToken);
}
