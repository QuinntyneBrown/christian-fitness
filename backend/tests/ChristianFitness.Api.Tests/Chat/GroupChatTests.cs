using System.Net;
using System.Threading.Channels;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Profiles;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;

namespace ChristianFitness.Api.Tests.Chat;

/// <summary>What the hub answers to a join or a send: a refusal code, or the chat's title and the caller's id (ADR 0039).</summary>
public sealed record ChatAnswerBody(string? Code, string? Title, Guid? MemberId);

/// <summary>One message as the hub pushes it to a chat's members.</summary>
public sealed record ChatMessageBody(Guid Id, Guid EventId, Guid AuthorId, string Author, string Text, DateTimeOffset SentAt);

/// <summary>
/// L2-016 for an event's group chat (slice 12.1; ADR 0039): registered members send and receive
/// messages live through <c>ChatHub</c>. A real SignalR client connects to the in-memory server and
/// every wait is an await with a timeout that says what did arrive; nothing sleeps.
/// </summary>
public sealed class GroupChatTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private static readonly TimeSpan Wait = TimeSpan.FromSeconds(10);

    private async Task<(HubConnection Hub, Channel<ChatMessageBody> Received, Guid MemberId, string Name)> ConnectedAsync(string email, string name, Guid? registerFor)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email) with { FullName = name });
        if (registerFor is { } eventId)
        {
            using var registered = await Browser.SendAsync(client, HttpMethod.Post, $"/api/events/{eventId}/registrations", cookie);
            Assert.Equal(HttpStatusCode.OK, registered.StatusCode);
        }

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
        var memberAnswer = await hub.InvokeAsync<ChatAnswerBody>("Join", registerFor ?? Guid.NewGuid(), TestContext.Current.CancellationToken);
        return (hub, received, memberAnswer.MemberId ?? Guid.Empty, name);
    }

    private static async Task<ChatMessageBody> NextAsync(Channel<ChatMessageBody> received, string what)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        timeout.CancelAfter(Wait);
        try
        {
            return await received.Reader.ReadAsync(timeout.Token);
        }
        catch (OperationCanceledException)
        {
            throw new TimeoutException($"No message arrived for {what} within {Wait.TotalSeconds} s.");
        }
    }

    [Fact]
    public async Task Given_nobody_signed_in_When_connecting_Then_the_hub_refuses()
    {
        var hub = new HubConnectionBuilder()
            .WithUrl(new Uri("https://localhost/api/chat"), options =>
            {
                options.Transports = HttpTransportType.LongPolling;
                options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
            })
            .Build();

        var refused = await Assert.ThrowsAnyAsync<HttpRequestException>(() => hub.StartAsync(TestContext.Current.CancellationToken));

        Assert.Equal(HttpStatusCode.Unauthorized, refused.StatusCode);
    }

    [Fact]
    public async Task Given_two_registered_members_in_the_chat_When_one_sends_Then_both_receive_it_with_author_and_time()
    {
        var eventId = await factory.AddEventAsync("Chat Run");
        var (grace, graceInbox, graceId, _) = await ConnectedAsync("grace.chat@example.org", "Grace Thompson", eventId);
        var (hope, hopeInbox, _, _) = await ConnectedAsync("hope.chat@example.org", "Hope Adeyemi", eventId);
        await using var _g = grace;
        await using var _h = hope;

        var answer = await grace.InvokeAsync<ChatAnswerBody>("Send", eventId, "Parking fills by 6:30", TestContext.Current.CancellationToken);

        Assert.Equal(new ChatAnswerBody(null, null, null), answer);
        var atGrace = await NextAsync(graceInbox, "Grace, who sent it");
        var atHope = await NextAsync(hopeInbox, "Hope, who is in the chat");
        Assert.Equal(atGrace, atHope);
        Assert.Equal(("Parking fills by 6:30", "Grace Thompson", graceId, eventId), (atHope.Text, atHope.Author, atHope.AuthorId, atHope.EventId));
        Assert.Equal(factory.Time.GetUtcNow(), atHope.SentAt);
    }

    [Fact]
    public async Task Given_a_member_in_another_events_chat_When_one_sends_Then_they_receive_nothing()
    {
        var eventId = await factory.AddEventAsync("Chat Ride");
        var otherId = await factory.AddEventAsync("Chat Swim");
        var (grace, _, _, _) = await ConnectedAsync("grace.apart@example.org", "Grace Thompson", eventId);
        var (hope, hopeInbox, _, _) = await ConnectedAsync("hope.apart@example.org", "Hope Adeyemi", otherId);
        var (mary, maryInbox, _, _) = await ConnectedAsync("mary.apart@example.org", "Mary Okoye", eventId);
        await using var _g = grace;
        await using var _h = hope;
        await using var _m = mary;

        await grace.InvokeAsync<ChatAnswerBody>("Send", eventId, "Only for the ride", TestContext.Current.CancellationToken);

        // Mary, in the same chat, is the proof the message has gone out; Hope, in the other, has none.
        Assert.Equal("Only for the ride", (await NextAsync(maryInbox, "Mary, who is in the chat")).Text);
        Assert.False(hopeInbox.Reader.TryRead(out var stray), $"Hope, in another chat, received: {stray?.Text}");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Given_a_blank_message_When_sent_Then_it_is_refused_message_invalid_and_nobody_receives_it(string text)
    {
        var eventId = await factory.AddEventAsync($"Chat Blank {text.Length}");
        var (grace, graceInbox, _, _) = await ConnectedAsync($"grace.blank{text.Length}@example.org", "Grace Thompson", eventId);
        await using var _g = grace;

        var answer = await grace.InvokeAsync<ChatAnswerBody>("Send", eventId, text, TestContext.Current.CancellationToken);

        Assert.Equal("message_invalid", answer.Code);
        Assert.False(graceInbox.Reader.TryRead(out _), "A refused message was still broadcast");
    }

    [Theory]
    [InlineData(2000, null)]
    [InlineData(2001, "message_invalid")]
    public async Task Given_a_message_at_the_length_limit_When_sent_Then_2000_characters_pass_and_2001_are_refused(int length, string? code)
    {
        var eventId = await factory.AddEventAsync($"Chat Long {length}");
        var (grace, graceInbox, _, _) = await ConnectedAsync($"grace.long{length}@example.org", "Grace Thompson", eventId);
        await using var _g = grace;

        var answer = await grace.InvokeAsync<ChatAnswerBody>("Send", eventId, new string('a', length), TestContext.Current.CancellationToken);

        Assert.Equal(code, answer.Code);
        if (code is null)
        {
            Assert.Equal(length, (await NextAsync(graceInbox, "Grace, at the limit")).Text.Length);
        }
    }

    [Fact]
    public async Task Given_a_member_who_did_not_register_When_they_join_or_send_Then_both_are_refused_not_a_participant()
    {
        var eventId = await factory.AddEventAsync("Chat Closed");
        var (grace, graceInbox, _, _) = await ConnectedAsync("grace.closed@example.org", "Grace Thompson", eventId);
        var (outsider, outsiderInbox, _, _) = await ConnectedAsync("tyler.closed@example.org", "Tyler Brooks", registerFor: null);
        await using var _g = grace;
        await using var _o = outsider;

        var joined = await outsider.InvokeAsync<ChatAnswerBody>("Join", eventId, TestContext.Current.CancellationToken);
        var sent = await outsider.InvokeAsync<ChatAnswerBody>("Send", eventId, "Can I come?", TestContext.Current.CancellationToken);
        await grace.InvokeAsync<ChatAnswerBody>("Send", eventId, "Members only", TestContext.Current.CancellationToken);

        Assert.Equal(("not_a_participant", "not_a_participant"), (joined.Code, sent.Code));
        Assert.Equal("Members only", (await NextAsync(graceInbox, "Grace, who is registered")).Text);
        Assert.False(outsiderInbox.Reader.TryRead(out var stray), $"An outsider received: {stray?.Text}");
    }

    [Fact]
    public async Task Given_an_unknown_event_When_a_member_joins_Then_it_is_refused_not_a_participant()
    {
        var (grace, _, _, _) = await ConnectedAsync("grace.unknown@example.org", "Grace Thompson", registerFor: null);
        await using var _g = grace;

        var answer = await grace.InvokeAsync<ChatAnswerBody>("Join", Guid.NewGuid(), TestContext.Current.CancellationToken);

        Assert.Equal("not_a_participant", answer.Code);
    }

    [Fact]
    public async Task Given_a_registered_member_When_they_join_Then_the_answer_names_the_chat_and_the_member()
    {
        var eventId = await factory.AddEventAsync("Chat Title Run");
        var (grace, _, graceId, _) = await ConnectedAsync("grace.title@example.org", "Grace Thompson", eventId);
        await using var _g = grace;

        var answer = await grace.InvokeAsync<ChatAnswerBody>("Join", eventId, TestContext.Current.CancellationToken);

        Assert.Equal(new ChatAnswerBody(null, "Chat Title Run", graceId), answer);
    }
}
