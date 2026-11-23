using System.Collections.Concurrent;
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
public sealed class ChatHub(ISender sender, IChatChannel channel) : Hub
{
    public const string Path = "/api/chat";

    /// <summary>Joins the event's chat on this connection.</summary>
    public Task<ChatAnswer> Join(Guid eventId) =>
        sender.Send(new JoinChatCommand(Caller, eventId, Context.ConnectionId), Context.ConnectionAborted);

    /// <summary>Sends a message to the event's chat.</summary>
    public Task<ChatAnswer> Send(Guid eventId, string? text) =>
        sender.Send(new SendChatMessageCommand(Caller, eventId, text), Context.ConnectionAborted);

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        channel.Disconnected(Context.ConnectionId);
        return base.OnDisconnectedAsync(exception);
    }

    private Guid Caller => Guid.Parse(Context.UserIdentifier!, CultureInfo.InvariantCulture);
}

/// <summary>Delivers a chat's messages through <see cref="ChatHub"/>'s groups, one group per event.</summary>
internal sealed class HubChatChannel(IHubContext<ChatHub> hub) : IChatChannel
{
    private static string GroupOf(Guid eventId) => $"event-chat:{eventId}";

    // Who is joined, by member and event, so leaving can take their connections out of the group. An
    // entry goes when its connection closes, so the map is as large as the live connections.
    private readonly ConcurrentDictionary<(Guid MemberId, Guid EventId), HashSet<string>> joined = new();

    public async Task JoinAsync(string connectionId, Guid memberId, Guid eventId, CancellationToken cancellationToken)
    {
        var connections = joined.GetOrAdd((memberId, eventId), _ => []);
        lock (connections)
        {
            connections.Add(connectionId);
        }

        await hub.Groups.AddToGroupAsync(connectionId, GroupOf(eventId), cancellationToken).ConfigureAwait(false);
    }

    public async Task LeaveAsync(Guid memberId, Guid eventId, CancellationToken cancellationToken)
    {
        if (!joined.TryRemove((memberId, eventId), out var connections))
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
            await hub.Groups.RemoveFromGroupAsync(connectionId, GroupOf(eventId), cancellationToken).ConfigureAwait(false);
        }
    }

    public Task NotifyCancelledAsync(Guid eventId, CancellationToken cancellationToken) =>
        hub.Clients.Group(GroupOf(eventId)).SendAsync("EventCancelled", eventId, cancellationToken);

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
                joined.TryRemove(new KeyValuePair<(Guid, Guid), HashSet<string>>(key, connections));
            }
        }
    }

    public Task SendAsync(ChatMessageDto message, CancellationToken cancellationToken) =>
        hub.Clients.Group(GroupOf(message.EventId)).SendAsync("MessageReceived", message, cancellationToken);
}
