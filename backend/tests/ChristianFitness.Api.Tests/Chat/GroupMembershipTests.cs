using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Channels;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Profiles;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;

namespace ChristianFitness.Api.Tests.Chat;

/// <summary>
/// L2-016 and L2-012 AC2 for who is in an event's group chat (slice 12.3; ADR 0041): cancelling a
/// registration leaves the chat at once, even on a connection already joined, and an event an Admin
/// cancels shows its chat a cancellation notice and takes no more messages. A real SignalR client
/// connects to the in-memory server; every wait is an await with a timeout that says what arrived.
/// </summary>
public sealed class GroupMembershipTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private static readonly TimeSpan Wait = TimeSpan.FromSeconds(10);

    private sealed record Member(HubConnection Hub, Channel<ChatMessageBody> Messages, Channel<Guid> Cancelled, HttpClient Client, string Cookie)
        : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            await Hub.DisposeAsync();
            Client.Dispose();
        }
    }

    private async Task<Member> JoinedChatAsync(string email, Guid eventId)
    {
        var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        using var registered = await Browser.SendAsync(client, HttpMethod.Post, $"/api/events/{eventId}/registrations", cookie);
        Assert.Equal(HttpStatusCode.OK, registered.StatusCode);
        var hub = new HubConnectionBuilder()
            .WithUrl(new Uri("https://localhost/api/chat"), options =>
            {
                options.Transports = HttpTransportType.LongPolling;
                options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                options.Headers["Cookie"] = cookie;
            })
            .Build();
        var messages = Channel.CreateUnbounded<ChatMessageBody>();
        var cancelled = Channel.CreateUnbounded<Guid>();
        hub.On<ChatMessageBody>("MessageReceived", message => messages.Writer.TryWrite(message));
        hub.On<Guid>("EventCancelled", id => cancelled.Writer.TryWrite(id));
        await hub.StartAsync(TestContext.Current.CancellationToken);
        var answer = await hub.InvokeAsync<ChatAnswerBody>("Join", eventId, TestContext.Current.CancellationToken);
        Assert.Null(answer.Code);
        return new Member(hub, messages, cancelled, client, cookie);
    }

    private static async Task<T> NextAsync<T>(Channel<T> channel, string what)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        timeout.CancelAfter(Wait);
        try
        {
            return await channel.Reader.ReadAsync(timeout.Token);
        }
        catch (OperationCanceledException)
        {
            throw new TimeoutException($"Nothing arrived for {what} within {Wait.TotalSeconds} s.");
        }
    }

    [Fact]
    public async Task Given_a_member_in_the_chat_When_they_cancel_their_registration_Then_they_receive_nothing_more_and_cannot_join_or_send()
    {
        var eventId = await factory.AddEventAsync("Membership Run");
        await using var grace = await JoinedChatAsync("grace.leave@example.org", eventId);
        await using var hope = await JoinedChatAsync("hope.leave@example.org", eventId);

        using var cancelled = await Browser.SendAsync(grace.Client, HttpMethod.Delete, $"/api/events/{eventId}/registrations/me", grace.Cookie);
        Assert.Equal(HttpStatusCode.OK, cancelled.StatusCode);
        await hope.Hub.InvokeAsync<ChatAnswerBody>("Send", eventId, "Grace has left", TestContext.Current.CancellationToken);

        // Hope, still in the chat, is the proof the message has gone out; Grace, who left, has none.
        Assert.Equal("Grace has left", (await NextAsync(hope.Messages, "Hope, who is still in the chat")).Text);
        Assert.False(grace.Messages.Reader.TryRead(out var stray), $"Grace received after leaving: {stray?.Text}");
        var sent = await grace.Hub.InvokeAsync<ChatAnswerBody>("Send", eventId, "Still here?", TestContext.Current.CancellationToken);
        var joined = await grace.Hub.InvokeAsync<ChatAnswerBody>("Join", eventId, TestContext.Current.CancellationToken);
        Assert.Equal(("not_a_participant", "not_a_participant"), (sent.Code, joined.Code));
    }

    [Fact]
    public async Task Given_a_member_who_left_When_they_register_again_and_join_Then_they_receive_messages_again()
    {
        var eventId = await factory.AddEventAsync("Membership Return Run");
        await using var grace = await JoinedChatAsync("grace.return@example.org", eventId);
        await using var hope = await JoinedChatAsync("hope.return@example.org", eventId);
        using var left = await Browser.SendAsync(grace.Client, HttpMethod.Delete, $"/api/events/{eventId}/registrations/me", grace.Cookie);
        Assert.Equal(HttpStatusCode.OK, left.StatusCode);
        using var back = await Browser.SendAsync(grace.Client, HttpMethod.Post, $"/api/events/{eventId}/registrations", grace.Cookie);
        Assert.Equal(HttpStatusCode.OK, back.StatusCode);

        var joined = await grace.Hub.InvokeAsync<ChatAnswerBody>("Join", eventId, TestContext.Current.CancellationToken);
        await hope.Hub.InvokeAsync<ChatAnswerBody>("Send", eventId, "Welcome back", TestContext.Current.CancellationToken);

        Assert.Null(joined.Code);
        Assert.Equal("Welcome back", (await NextAsync(grace.Messages, "Grace, who joined again")).Text);
    }

    [Fact]
    public async Task Given_an_event_staff_cancel_When_members_are_in_its_chat_Then_they_are_told_and_it_takes_no_more_messages()
    {
        var eventId = await factory.AddEventAsync("Membership Cancelled Run");
        await using var grace = await JoinedChatAsync("grace.notice@example.org", eventId);
        await using var hope = await JoinedChatAsync("hope.notice@example.org", eventId);
        using var staff = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, staff, "dana.notice@example.org", Domain.Members.StaffRoleName.Admin);
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, staff, "dana.notice@example.org");

        using var cancelled = await AdminEvents.SendAsync(staff, HttpMethod.Post, $"/api/admin/events/{eventId}/cancel", Staff.Cookie(signedIn));

        Assert.Equal(HttpStatusCode.OK, cancelled.StatusCode);
        Assert.Equal(eventId, await NextAsync(grace.Cancelled, "Grace, who is in the chat"));
        Assert.Equal(eventId, await NextAsync(hope.Cancelled, "Hope, who is in the chat"));
        var sent = await grace.Hub.InvokeAsync<ChatAnswerBody>("Send", eventId, "Is it off?", TestContext.Current.CancellationToken);
        Assert.Equal("event_cancelled", sent.Code);
        Assert.False(hope.Messages.Reader.TryRead(out var stray), $"A message reached a cancelled chat: {stray?.Text}");
        using var history = await Browser.SendAsync(grace.Client, HttpMethod.Get, $"/api/events/{eventId}/chat/messages", grace.Cookie);
        var body = await history.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.True(body.GetProperty("cancelled").GetBoolean());
    }
}
