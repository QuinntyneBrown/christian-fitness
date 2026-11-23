using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Profiles;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;

namespace ChristianFitness.Api.Tests.Chat;

/// <summary>
/// L2-015 AC1 and AC2 and L2-016 AC7 (slice 15.1; ADR 0042): <c>GET /api/conversations</c> lists the
/// conversations a member belongs to, newest first, each with its last message, its unread count and,
/// for an event group, its member count; opening a chat (<c>POST /api/events/{id}/chat/read</c>) moves
/// that member's read marker for that conversation only. Messages go in through the hub, as members
/// send them; every test advances the fake clock between sends so the order is by instant.
/// </summary>
public sealed class ConversationListTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private sealed record Person(string Cookie, HubConnection Hub) : IAsyncDisposable
    {
        public ValueTask DisposeAsync() => Hub.DisposeAsync();

        public async Task SayAsync(Guid eventId, string text, RegisterForEventFactory factory)
        {
            var answer = await Hub.InvokeAsync<ChatAnswerBody>("Send", eventId, text, TestContext.Current.CancellationToken);
            Assert.Null(answer.Code);
            factory.Time.Advance(TimeSpan.FromSeconds(1));
        }
    }

    private async Task<Person> MemberAsync(string email, string name, params Guid[] registerFor)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email) with { FullName = name });
        foreach (var eventId in registerFor)
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
        await hub.StartAsync(TestContext.Current.CancellationToken);
        return new Person(cookie, hub);
    }

    private async Task<JsonElement[]> ListAsync(string cookie)
    {
        using var client = Browser.CreateClient(factory);
        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/conversations", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return body.GetProperty("conversations").EnumerateArray().ToArray();
    }

    private async Task<HttpStatusCode> ReadAsync(string cookie, Guid eventId)
    {
        using var client = Browser.CreateClient(factory);
        using var response = await Browser.SendAsync(client, HttpMethod.Post, $"/api/events/{eventId}/chat/read", cookie);
        return response.StatusCode;
    }

    private static (string Name, int Unread) Summary(JsonElement row) =>
        (row.GetProperty("name").GetString()!, row.GetProperty("unreadCount").GetInt32());

    [Fact]
    public async Task Given_two_chats_with_messages_When_a_member_lists_Then_the_newest_comes_first_with_last_message_unread_and_member_count()
    {
        var older = await factory.AddEventAsync("List Older Run");
        var newer = await factory.AddEventAsync("List Newer Run");
        await using var grace = await MemberAsync("grace.list1@example.org", "Grace Thompson", older, newer);
        await using var hope = await MemberAsync("hope.list1@example.org", "Hope Adeyemi", older, newer);
        await hope.SayAsync(older, "Older one", factory);
        await hope.SayAsync(newer, "Newer one", factory);
        await hope.SayAsync(newer, "Newer two", factory);

        var rows = await ListAsync(grace.Cookie);

        Assert.Equal([("List Newer Run", 2), ("List Older Run", 1)], rows.Select(Summary));
        var first = rows[0];
        Assert.Equal(("group", newer, 2), (first.GetProperty("kind").GetString(), first.GetProperty("id").GetGuid(), first.GetProperty("memberCount").GetInt32()));
        var last = first.GetProperty("lastMessage");
        Assert.Equal(("Hope Adeyemi", "Newer two"), (last.GetProperty("author").GetString(), last.GetProperty("text").GetString()));
        Assert.Equal(factory.Time.GetUtcNow() - TimeSpan.FromSeconds(1), last.GetProperty("sentAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task Given_unread_messages_When_a_member_opens_one_chat_Then_only_that_count_becomes_zero_and_later_messages_count_again()
    {
        var first = await factory.AddEventAsync("Marker First Run");
        var second = await factory.AddEventAsync("Marker Second Run");
        await using var grace = await MemberAsync("grace.marker@example.org", "Grace Thompson", first, second);
        await using var hope = await MemberAsync("hope.marker@example.org", "Hope Adeyemi", first, second);
        await hope.SayAsync(first, "One", factory);
        await hope.SayAsync(second, "Two", factory);
        await hope.SayAsync(second, "Three", factory);

        Assert.Equal(HttpStatusCode.NoContent, await ReadAsync(grace.Cookie, second));
        var afterOpen = await ListAsync(grace.Cookie);
        factory.Time.Advance(TimeSpan.FromSeconds(1));
        await hope.SayAsync(second, "Four", factory);
        var afterMore = await ListAsync(grace.Cookie);

        Assert.Equal([("Marker Second Run", 0), ("Marker First Run", 1)], afterOpen.Select(Summary));
        Assert.Equal([("Marker Second Run", 1), ("Marker First Run", 1)], afterMore.Select(Summary));
    }

    [Fact]
    public async Task Given_a_member_who_wrote_the_last_message_When_they_list_Then_their_own_messages_are_not_unread()
    {
        var eventId = await factory.AddEventAsync("Own Words Run");
        await using var grace = await MemberAsync("grace.own@example.org", "Grace Thompson", eventId);
        await grace.SayAsync(eventId, "Mine", factory);

        var rows = await ListAsync(grace.Cookie);

        Assert.Equal([("Own Words Run", 0)], rows.Select(Summary));
        Assert.Equal("Mine", rows[0].GetProperty("lastMessage").GetProperty("text").GetString());
    }

    [Fact]
    public async Task Given_a_chat_with_no_messages_When_a_member_lists_Then_it_is_listed_without_a_last_message()
    {
        var eventId = await factory.AddEventAsync("Quiet Run");
        await using var grace = await MemberAsync("grace.quiet@example.org", "Grace Thompson", eventId);

        var rows = await ListAsync(grace.Cookie);

        var only = Assert.Single(rows);
        Assert.Equal(JsonValueKind.Null, only.GetProperty("lastMessage").ValueKind);
        Assert.Equal(0, only.GetProperty("unreadCount").GetInt32());
    }

    [Fact]
    public async Task Given_a_member_in_no_chat_When_they_list_Then_the_list_is_empty_and_holds_nobody_elses_chat()
    {
        var eventId = await factory.AddEventAsync("Not Yours Run");
        await using var hope = await MemberAsync("hope.nobody@example.org", "Hope Adeyemi", eventId);
        await hope.SayAsync(eventId, "Private to the run", factory);
        await using var tyler = await MemberAsync("tyler.nobody@example.org", "Tyler Brooks");

        var rows = await ListAsync(tyler.Cookie);

        Assert.Empty(rows);
    }

    [Fact]
    public async Task Given_a_member_who_cancelled_their_registration_When_they_list_Then_the_chat_is_gone()
    {
        var eventId = await factory.AddEventAsync("Left Run");
        await using var grace = await MemberAsync("grace.left@example.org", "Grace Thompson", eventId);
        using var client = Browser.CreateClient(factory);
        using var cancelled = await Browser.SendAsync(client, HttpMethod.Delete, $"/api/events/{eventId}/registrations/me", grace.Cookie);
        Assert.Equal(HttpStatusCode.OK, cancelled.StatusCode);

        var rows = await ListAsync(grace.Cookie);

        Assert.Empty(rows);
    }

    [Fact]
    public async Task Given_more_chats_than_the_window_When_a_member_lists_Then_only_the_newest_50_come()
    {
        var ids = new List<Guid>();
        for (var number = 1; number <= 51; number++)
        {
            ids.Add(await factory.AddEventAsync($"Window Run {number:00}"));
        }

        await using var grace = await MemberAsync("grace.window@example.org", "Grace Thompson", [.. ids]);
        await using var hope = await MemberAsync("hope.window@example.org", "Hope Adeyemi", [.. ids]);
        foreach (var id in ids)
        {
            await hope.SayAsync(id, "Hello", factory);
        }

        var rows = await ListAsync(grace.Cookie);

        Assert.Equal(50, rows.Length);
        Assert.Equal("Window Run 51", rows[0].GetProperty("name").GetString());
        Assert.DoesNotContain(rows, row => row.GetProperty("name").GetString() == "Window Run 01");
    }

    [Fact]
    public async Task Given_a_member_not_registered_When_they_open_a_chat_Then_the_marker_is_refused_403_not_a_participant()
    {
        var eventId = await factory.AddEventAsync("Marker Closed Run");
        await using var tyler = await MemberAsync("tyler.marker@example.org", "Tyler Brooks");
        using var client = Browser.CreateClient(factory);

        using var refused = await Browser.SendAsync(client, HttpMethod.Post, $"/api/events/{eventId}/chat/read", tyler.Cookie);
        using var unknown = await Browser.SendAsync(client, HttpMethod.Post, $"/api/events/{Guid.NewGuid()}/chat/read", tyler.Cookie);

        Assert.Equal((HttpStatusCode.Forbidden, HttpStatusCode.Forbidden), (refused.StatusCode, unknown.StatusCode));
        var body = await refused.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("not_a_participant", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_nobody_signed_in_When_the_list_or_the_marker_is_asked_Then_both_are_refused_401()
    {
        using var client = Browser.CreateClient(factory);

        using var list = await Browser.SendAsync(client, HttpMethod.Get, "/api/conversations", cookie: null!);
        using var read = await Browser.SendAsync(client, HttpMethod.Post, $"/api/events/{Guid.NewGuid()}/chat/read", cookie: null!);

        Assert.Equal((HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized), (list.StatusCode, read.StatusCode));
    }
}
