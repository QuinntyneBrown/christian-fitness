using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Channels;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Chat;

/// <summary>
/// L2-014 and L2-016 for a private conversation between two members (slice 14.1; ADR 0043): the hub's
/// <c>JoinDirect</c> and <c>SendDirect</c>, the stored history and read marker under
/// <c>/api/messages/{memberId}</c>, and the conversation list's <c>direct</c> rows. A real SignalR client
/// connects to the in-memory server and every wait is an await with a timeout; nothing sleeps.
/// </summary>
public sealed class DirectMessageTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private static readonly TimeSpan Wait = TimeSpan.FromSeconds(10);

    private sealed record Person(string Cookie, Guid Id, string Name, HubConnection Hub, Channel<ChatMessageBody> Inbox) : IAsyncDisposable
    {
        public ValueTask DisposeAsync() => Hub.DisposeAsync();
    }

    private async Task<Person> MemberAsync(string email, string name)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email) with { FullName = name });
        var hub = new HubConnectionBuilder()
            .WithUrl(new Uri("https://localhost/api/chat"), options =>
            {
                options.Transports = HttpTransportType.LongPolling;
                options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                options.Headers["Cookie"] = cookie;
            })
            .Build();
        var inbox = Channel.CreateUnbounded<ChatMessageBody>();
        hub.On<ChatMessageBody>("MessageReceived", message => inbox.Writer.TryWrite(message));
        await hub.StartAsync(TestContext.Current.CancellationToken);
        using var scope = factory.Services.CreateScope();
        var normalized = Member.NormalizeEmail(email);
        var id = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Members
            .Where(m => m.NormalizedEmail == normalized).Select(m => m.Id)
            .SingleAsync(TestContext.Current.CancellationToken);
        return new Person(cookie, id, name, hub, inbox);
    }

    private static async Task<ChatMessageBody> NextAsync(Channel<ChatMessageBody> inbox, string what)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        timeout.CancelAfter(Wait);
        try
        {
            return await inbox.Reader.ReadAsync(timeout.Token);
        }
        catch (OperationCanceledException)
        {
            throw new TimeoutException($"No message arrived for {what} within {Wait.TotalSeconds} s.");
        }
    }

    private static Task<ChatAnswerBody> JoinAsync(Person from, Guid to) =>
        from.Hub.InvokeAsync<ChatAnswerBody>("JoinDirect", to, TestContext.Current.CancellationToken);

    private async Task SayAsync(Person from, Guid to, string text)
    {
        var answer = await from.Hub.InvokeAsync<ChatAnswerBody>("SendDirect", to, text, TestContext.Current.CancellationToken);
        Assert.Null(answer.Code);
        factory.Time.Advance(TimeSpan.FromSeconds(1));
    }

    private async Task<(HttpStatusCode Status, JsonElement Body)> GetAsync(Person who, string url)
    {
        using var client = Browser.CreateClient(factory);
        using var response = await Browser.SendAsync(client, HttpMethod.Get, url, who.Cookie);
        var body = response.Content.Headers.ContentLength == 0
            ? default
            : await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return (response.StatusCode, body);
    }

    private async Task<HttpStatusCode> PostAsync(Person who, string url)
    {
        using var client = Browser.CreateClient(factory);
        using var response = await Browser.SendAsync(client, HttpMethod.Post, url, who.Cookie);
        return response.StatusCode;
    }

    [Fact]
    public async Task Given_two_members_When_one_joins_and_sends_Then_both_receive_it_keyed_by_the_other_member()
    {
        await using var grace = await MemberAsync("grace.dm1@example.org", "Grace Thompson");
        await using var hope = await MemberAsync("hope.dm1@example.org", "Hope Adeyemi");

        var joined = await JoinAsync(grace, hope.Id);
        var answer = await grace.Hub.InvokeAsync<ChatAnswerBody>("SendDirect", hope.Id, "Coffee after the run?", TestContext.Current.CancellationToken);

        Assert.Equal(new ChatAnswerBody(null, "Hope Adeyemi", grace.Id), joined);
        Assert.Null(answer.Code);
        var atHope = await NextAsync(hope.Inbox, "Hope, the recipient");
        var atGrace = await NextAsync(grace.Inbox, "Grace, the sender");
        Assert.Equal(("Coffee after the run?", "Grace Thompson", grace.Id, grace.Id), (atHope.Text, atHope.Author, atHope.AuthorId, atHope.EventId));
        Assert.Equal(hope.Id, atGrace.EventId);
        Assert.Equal(atHope.Id, atGrace.Id);
        Assert.Equal(factory.Time.GetUtcNow(), atHope.SentAt);
    }

    [Fact]
    public async Task Given_a_third_member_When_two_talk_Then_the_third_receives_nothing_and_cannot_read_the_history()
    {
        await using var grace = await MemberAsync("grace.dm2@example.org", "Grace Thompson");
        await using var hope = await MemberAsync("hope.dm2@example.org", "Hope Adeyemi");
        await using var mary = await MemberAsync("mary.dm2@example.org", "Mary Okoye");
        await SayAsync(grace, hope.Id, "Just us");
        Assert.Equal("Just us", (await NextAsync(hope.Inbox, "Hope")).Text);

        var maryHistory = await GetAsync(mary, $"/api/messages/{hope.Id}/messages");

        Assert.False(mary.Inbox.Reader.TryRead(out var stray), $"Mary received: {stray?.Text}");
        Assert.Equal([], maryHistory.Body.GetProperty("messages").EnumerateArray().ToArray());
        var graceHistory = await GetAsync(grace, $"/api/messages/{hope.Id}/messages");
        Assert.Equal(["Just us"], graceHistory.Body.GetProperty("messages").EnumerateArray().Select(m => m.GetProperty("text").GetString()));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Given_empty_text_When_sent_Then_message_invalid(string text)
    {
        await using var grace = await MemberAsync($"grace.dm3{text.Length}@example.org", "Grace Thompson");
        await using var hope = await MemberAsync($"hope.dm3{text.Length}@example.org", "Hope Adeyemi");

        var answer = await grace.Hub.InvokeAsync<ChatAnswerBody>("SendDirect", hope.Id, text, TestContext.Current.CancellationToken);

        Assert.Equal("message_invalid", answer.Code);
    }

    [Fact]
    public async Task Given_text_over_2000_characters_When_sent_Then_message_invalid()
    {
        await using var grace = await MemberAsync("grace.dm4@example.org", "Grace Thompson");
        await using var hope = await MemberAsync("hope.dm4@example.org", "Hope Adeyemi");

        var answer = await grace.Hub.InvokeAsync<ChatAnswerBody>("SendDirect", hope.Id, new string('x', 2001), TestContext.Current.CancellationToken);

        Assert.Equal("message_invalid", answer.Code);
    }

    [Fact]
    public async Task Given_an_unknown_a_suspended_and_my_own_id_When_joining_or_sending_or_reading_Then_recipient_unavailable()
    {
        await using var grace = await MemberAsync("grace.dm5@example.org", "Grace Thompson");
        await using var tyler = await MemberAsync("tyler.dm5@example.org", "Tyler Brooks");
        await factory.SuspendAsync("tyler.dm5@example.org");

        foreach (var target in new[] { Guid.NewGuid(), tyler.Id, grace.Id })
        {
            Assert.Equal("recipient_unavailable", (await JoinAsync(grace, target)).Code);
            var sent = await grace.Hub.InvokeAsync<ChatAnswerBody>("SendDirect", target, "Hello", TestContext.Current.CancellationToken);
            Assert.Equal("recipient_unavailable", sent.Code);
            var history = await GetAsync(grace, $"/api/messages/{target}/messages");
            Assert.Equal(HttpStatusCode.Forbidden, history.Status);
            Assert.Equal("recipient_unavailable", history.Body.GetProperty("code").GetString());
            Assert.Equal(HttpStatusCode.Forbidden, await PostAsync(grace, $"/api/messages/{target}/read"));
        }
    }

    [Fact]
    public async Task Given_51_messages_When_reading_history_Then_the_latest_50_come_oldest_first_and_before_pages_back()
    {
        await using var grace = await MemberAsync("grace.dm6@example.org", "Grace Thompson");
        await using var hope = await MemberAsync("hope.dm6@example.org", "Hope Adeyemi");
        for (var n = 1; n <= 51; n++)
        {
            await SayAsync(grace, hope.Id, $"m{n}");
        }

        var latest = (await GetAsync(hope, $"/api/messages/{grace.Id}/messages")).Body;
        var texts = latest.GetProperty("messages").EnumerateArray().Select(m => m.GetProperty("text").GetString()).ToArray();
        var oldestId = latest.GetProperty("messages")[0].GetProperty("id").GetGuid();
        var earlier = (await GetAsync(hope, $"/api/messages/{grace.Id}/messages?before={oldestId}")).Body;

        Assert.Equal((50, "m2", "m51", true), (texts.Length, texts[0], texts[^1], latest.GetProperty("hasMore").GetBoolean()));
        Assert.Equal(["m1"], earlier.GetProperty("messages").EnumerateArray().Select(m => m.GetProperty("text").GetString()));
        Assert.False(earlier.GetProperty("hasMore").GetBoolean());
    }

    [Fact]
    public async Task Given_a_direct_conversation_When_listed_Then_it_shows_the_other_member_with_unread_until_read()
    {
        await using var grace = await MemberAsync("grace.dm7@example.org", "Grace Thompson");
        await using var hope = await MemberAsync("hope.dm7@example.org", "Hope Adeyemi");
        await SayAsync(grace, hope.Id, "First");
        await SayAsync(grace, hope.Id, "Second");

        var hopeRows = (await GetAsync(hope, "/api/conversations")).Body.GetProperty("conversations").EnumerateArray().ToArray();
        var graceRows = (await GetAsync(grace, "/api/conversations")).Body.GetProperty("conversations").EnumerateArray().ToArray();

        var row = Assert.Single(hopeRows);
        Assert.Equal(("direct", grace.Id, "Grace Thompson", 2), (row.GetProperty("kind").GetString(), row.GetProperty("id").GetGuid(), row.GetProperty("name").GetString(), row.GetProperty("unreadCount").GetInt32()));
        Assert.Equal("Second", row.GetProperty("lastMessage").GetProperty("text").GetString());
        Assert.Equal(JsonValueKind.Null, row.GetProperty("memberCount").ValueKind);
        var mine = Assert.Single(graceRows);
        Assert.Equal(("Hope Adeyemi", 0), (mine.GetProperty("name").GetString(), mine.GetProperty("unreadCount").GetInt32()));

        Assert.Equal(HttpStatusCode.NoContent, await PostAsync(hope, $"/api/messages/{grace.Id}/read"));
        var after = (await GetAsync(hope, "/api/conversations")).Body.GetProperty("conversations").EnumerateArray().Single();
        Assert.Equal(0, after.GetProperty("unreadCount").GetInt32());
    }
}
