using System.Collections.Concurrent;
using System.Globalization;
using ChristianFitness.Application.Chat;
using ChristianFitness.Application.Notifications;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.AspNetCore.SignalR;

namespace ChristianFitness.Api.Chat;

/// <summary>
/// The event group chat's hub at <see cref="Path"/> (L2-016; slice 12.1; ADR 0039). A method checks
/// nothing: it sends one MediatR request and returns the handler's answer, which carries a refusal
/// as a <c>code</c>. The session cookie authenticates the connection through the fallback policy.
/// </summary>
public sealed class ChatHub(ISender sender, IChatChannel channel) : Hub
{
    public const string Path = "/api/chat";

    /// <summary>Joins a group chat on this connection: a standalone event's or a series' (ADR 0101), named by its id.</summary>
    public Task<ChatAnswer> Join(Guid chatId) =>
        sender.Send(new JoinChatCommand(Caller, chatId, Context.ConnectionId), Context.ConnectionAborted);

    /// <summary>Sends a message to a group chat named by its id.</summary>
    public Task<ChatAnswer> Send(Guid chatId, string? text) =>
        sender.Send(new SendChatMessageCommand(Caller, chatId, text), Context.ConnectionAborted);

    /// <summary>Opens a direct conversation with a member (slice 14.1; ADR 0043).</summary>
    public Task<ChatAnswer> JoinDirect(Guid memberId) =>
        sender.Send(new JoinDirectCommand(Caller, memberId), Context.ConnectionAborted);

    /// <summary>Sends a direct message to a member.</summary>
    public Task<ChatAnswer> SendDirect(Guid memberId, string? text) =>
        sender.Send(new SendDirectMessageCommand(Caller, memberId, text), Context.ConnectionAborted);

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        channel.Disconnected(Context.ConnectionId);
        return base.OnDisconnectedAsync(exception);
    }

    private Guid Caller => Guid.Parse(Context.UserIdentifier!, CultureInfo.InvariantCulture);
}

/// <summary>
/// Delivers a chat's messages through <see cref="ChatHub"/>'s groups, one group per conversation scope:
/// a standalone event's chat or a series' one chat (ADR 0101).
/// </summary>
internal sealed class HubChatChannel(IHubContext<ChatHub> hub) : IChatChannel
{
    private static string GroupOf(ChatScope scope) =>
        scope.Kind == ChatScopeKind.Series ? $"chat:series:{scope.Id}" : $"chat:event:{scope.Id}";

    // Who is joined, by member and chat, so leaving can take their connections out of the group. An
    // entry goes when its connection closes, so the map is as large as the live connections.
    private readonly ConcurrentDictionary<(Guid MemberId, ChatScope Scope), HashSet<string>> joined = new();

    public async Task JoinAsync(string connectionId, Guid memberId, ChatScope scope, CancellationToken cancellationToken)
    {
        var connections = joined.GetOrAdd((memberId, scope), _ => []);
        lock (connections)
        {
            connections.Add(connectionId);
        }

        await hub.Groups.AddToGroupAsync(connectionId, GroupOf(scope), cancellationToken).ConfigureAwait(false);
    }

    public async Task LeaveAsync(Guid memberId, ChatScope scope, CancellationToken cancellationToken)
    {
        if (!joined.TryRemove((memberId, scope), out var connections))
        {
            return;
        }

        string[] held;
        lock (connections)
        {
            held = [.. connections];
        }

        foreach (var connectionId in held)
        {
            await hub.Groups.RemoveFromGroupAsync(connectionId, GroupOf(scope), cancellationToken).ConfigureAwait(false);
        }
    }

    public Task NotifyCancelledAsync(ChatScope scope, CancellationToken cancellationToken) =>
        hub.Clients.Group(GroupOf(scope)).SendAsync("EventCancelled", scope.Id, cancellationToken);

    public void Disconnected(string connectionId)
    {
        foreach (var (key, connections) in joined)
        {
            bool empty;
            lock (connections)
            {
                connections.Remove(connectionId);
                empty = connections.Count == 0;
            }

            if (empty)
            {
                joined.TryRemove(new KeyValuePair<(Guid, ChatScope), HashSet<string>>(key, connections));
            }
        }
    }

    public Task SendToMemberAsync(Guid memberId, ChatMessageDto message, CancellationToken cancellationToken) =>
        hub.Clients.User(memberId.ToString()).SendAsync("MessageReceived", message, cancellationToken);

    public Task SendAsync(ChatScope scope, ChatMessageDto message, CancellationToken cancellationToken) =>
        hub.Clients.Group(GroupOf(scope)).SendAsync("MessageReceived", message, cancellationToken);
}

/// <summary>
/// Delivers a notification to every connection of one member through <see cref="ChatHub"/>, the one
/// real-time connection of a member session (ADR 0083).
/// </summary>
internal sealed class HubNotificationChannel(IHubContext<ChatHub> hub) : INotificationChannel
{
    public Task SendAsync(Guid memberId, NotificationDto notification, CancellationToken cancellationToken) =>
        hub.Clients.User(memberId.ToString()).SendAsync("NotificationReceived", notification, cancellationToken);
}
