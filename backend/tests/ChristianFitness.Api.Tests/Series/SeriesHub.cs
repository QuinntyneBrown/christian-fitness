using System.Threading.Channels;
using ChristianFitness.Api.Tests.Chat;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// A member's real SignalR client on the in-memory server (ADR 0039), as the series chat tests use
/// it: connected with the member's session cookie, every pushed message kept in a channel, and every
/// wait an await with a timeout that names what did not arrive.
/// </summary>
internal sealed class SeriesHub : IAsyncDisposable
{
    private static readonly TimeSpan Wait = TimeSpan.FromSeconds(10);

    private SeriesHub(HubConnection hub, Channel<ChatMessageBody> received)
    {
        Hub = hub;
        Received = received;
    }

    public HubConnection Hub { get; }

    public Channel<ChatMessageBody> Received { get; }

    /// <summary>Connects the member whose session <paramref name="cookie"/> is.</summary>
    public static async Task<SeriesHub> ConnectAsync(AdminSeriesFactory factory, string cookie)
    {
        var hub = new HubConnectionBuilder()
            .WithUrl(new Uri("https://localhost/api/chat"), options =>
            {
                options.Transports = HttpTransportType.LongPolling;
                options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                options.Headers["Cookie"] = cookie;
            })
            .Build();
        var received = Channel.CreateUnbounded<ChatMessageBody>();
        hub.On<ChatMessageBody>("MessageReceived", message => received.Writer.TryWrite(message));
        await hub.StartAsync(TestContext.Current.CancellationToken);
        return new SeriesHub(hub, received);
    }

    /// <summary>Asks to join the chat whose id is <paramref name="chatId"/> (an event's or a series').</summary>
    public Task<ChatAnswerBody> JoinAsync(Guid chatId) =>
        Hub.InvokeAsync<ChatAnswerBody>("Join", chatId, TestContext.Current.CancellationToken);

    public Task<ChatAnswerBody> SendAsync(Guid chatId, string text) =>
        Hub.InvokeAsync<ChatAnswerBody>("Send", chatId, text, TestContext.Current.CancellationToken);

    /// <summary>The next message pushed to this member; <paramref name="what"/> names who waits for it.</summary>
    public async Task<ChatMessageBody> NextAsync(string what)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        timeout.CancelAfter(Wait);
        try
        {
            return await Received.Reader.ReadAsync(timeout.Token);
        }
        catch (OperationCanceledException)
        {
            throw new TimeoutException($"No message arrived for {what} within {Wait.TotalSeconds} s.");
        }
    }

    public ValueTask DisposeAsync() => Hub.DisposeAsync();
}
