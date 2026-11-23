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
/// L2-016 AC6 for an event's group chat (slice 12.2; ADR 0040): messages are stored, the latest 50
/// load when the chat opens and earlier ones load a page at a time. Messages go in through the hub,
/// as members send them, and come back through <c>GET /api/events/{id}/chat/messages</c>.
/// </summary>
public sealed class ChatHistoryTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private async Task<(string Cookie, HubConnection Hub)> MemberAsync(string email, string name, Guid? registerFor)
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
        await hub.StartAsync(TestContext.Current.CancellationToken);
        return (cookie, hub);
    }

    private async Task<HttpResponseMessage> HistoryAsync(string cookie, Guid eventId, string query = "")
    {
        using var client = Browser.CreateClient(factory);
        return await Browser.SendAsync(client, HttpMethod.Get, $"/api/events/{eventId}/chat/messages{query}", cookie);
    }

    private static async Task<(string[] Texts, string[] Ids, bool HasMore)> ReadAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        var messages = body.GetProperty("messages").EnumerateArray().ToArray();
        return (
            messages.Select(m => m.GetProperty("text").GetString()!).ToArray(),
            messages.Select(m => m.GetProperty("id").GetString()!).ToArray(),
            body.GetProperty("hasMore").GetBoolean());
    }

    private async Task SendManyAsync(HubConnection hub, Guid eventId, int count)
    {
        for (var number = 1; number <= count; number++)
        {
            var answer = await hub.InvokeAsync<ChatAnswerBody>("Send", eventId, $"Message {number}", TestContext.Current.CancellationToken);
            Assert.Null(answer.Code);
            factory.Time.Advance(TimeSpan.FromSeconds(1));
        }
    }

    [Fact]
    public async Task Given_a_chat_with_60_messages_When_it_opens_Then_the_latest_50_come_oldest_first_and_there_are_more()
    {
        var eventId = await factory.AddEventAsync("History Latest Run");
        var (cookie, hub) = await MemberAsync("grace.latest@example.org", "Grace Thompson", eventId);
        await using var _h = hub;
        await SendManyAsync(hub, eventId, 60);

        var (texts, _, hasMore) = await ReadAsync(await HistoryAsync(cookie, eventId));

        Assert.Equal(Enumerable.Range(11, 50).Select(n => $"Message {n}"), texts);
        Assert.True(hasMore);
    }

    [Fact]
    public async Task Given_the_latest_50_are_loaded_When_the_page_before_the_oldest_is_asked_Then_the_10_earlier_come_and_there_are_no_more()
    {
        var eventId = await factory.AddEventAsync("History Earlier Run");
        var (cookie, hub) = await MemberAsync("grace.earlier@example.org", "Grace Thompson", eventId);
        await using var _h = hub;
        await SendManyAsync(hub, eventId, 60);
        var (_, ids, _) = await ReadAsync(await HistoryAsync(cookie, eventId));

        var (texts, _, hasMore) = await ReadAsync(await HistoryAsync(cookie, eventId, $"?before={ids[0]}"));

        Assert.Equal(Enumerable.Range(1, 10).Select(n => $"Message {n}"), texts);
        Assert.False(hasMore);
    }

    [Fact]
    public async Task Given_a_chat_with_50_messages_When_it_opens_Then_all_come_and_there_are_no_more()
    {
        var eventId = await factory.AddEventAsync("History Exact Run");
        var (cookie, hub) = await MemberAsync("grace.exact@example.org", "Grace Thompson", eventId);
        await using var _h = hub;
        await SendManyAsync(hub, eventId, 50);

        var (texts, _, hasMore) = await ReadAsync(await HistoryAsync(cookie, eventId));

        Assert.Equal(50, texts.Length);
        Assert.False(hasMore);
    }

    [Fact]
    public async Task Given_messages_in_two_chats_When_one_is_read_Then_only_its_own_come_with_author_and_time()
    {
        var eventId = await factory.AddEventAsync("History Mine Run");
        var otherId = await factory.AddEventAsync("History Other Run");
        var (cookie, hub) = await MemberAsync("grace.mine@example.org", "Grace Thompson", eventId);
        var (_, otherHub) = await MemberAsync("hope.other@example.org", "Hope Adeyemi", otherId);
        await using var _h = hub;
        await using var _o = otherHub;
        await hub.InvokeAsync<ChatAnswerBody>("Send", eventId, "Bring <b>water</b>", TestContext.Current.CancellationToken);
        await otherHub.InvokeAsync<ChatAnswerBody>("Send", otherId, "Not for this chat", TestContext.Current.CancellationToken);

        var response = await HistoryAsync(cookie, eventId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        var only = Assert.Single(body.GetProperty("messages").EnumerateArray());
        Assert.Equal(("Bring <b>water</b>", "Grace Thompson", eventId), (only.GetProperty("text").GetString(), only.GetProperty("author").GetString(), only.GetProperty("eventId").GetGuid()));
        Assert.Equal(factory.Time.GetUtcNow(), only.GetProperty("sentAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task Given_a_member_who_did_not_register_When_they_ask_for_history_Then_it_is_refused_403_not_a_participant()
    {
        var eventId = await factory.AddEventAsync("History Closed Run");
        var (_, hub) = await MemberAsync("grace.closed2@example.org", "Grace Thompson", eventId);
        await using var _h = hub;
        await hub.InvokeAsync<ChatAnswerBody>("Send", eventId, "Members only", TestContext.Current.CancellationToken);
        var (outsider, outsiderHub) = await MemberAsync("tyler.closed2@example.org", "Tyler Brooks", registerFor: null);
        await using var _o = outsiderHub;

        var refused = await HistoryAsync(outsider, eventId);
        var unknown = await HistoryAsync(outsider, Guid.NewGuid());

        Assert.Equal((HttpStatusCode.Forbidden, HttpStatusCode.Forbidden), (refused.StatusCode, unknown.StatusCode));
        var body = await refused.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("not_a_participant", body.GetProperty("code").GetString());
        Assert.DoesNotContain("Members only", await refused.Content.ReadAsStringAsync(TestContext.Current.CancellationToken), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Given_nobody_signed_in_When_history_is_asked_Then_it_is_refused_401()
    {
        var eventId = await factory.AddEventAsync("History Anonymous Run");

        var refused = await HistoryAsync(cookie: null!, eventId);

        Assert.Equal(HttpStatusCode.Unauthorized, refused.StatusCode);
    }
}
