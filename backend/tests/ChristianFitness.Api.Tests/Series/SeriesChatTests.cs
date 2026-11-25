using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Chat;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-052 AC2 (ADR 0080, ADR 0099): a series has one group chat, keyed by the series. Its members
/// are those who joined the series and those who hold a place at one of its sessions that has not
/// ended; it is addressed by the series' id, and a session's own id has no chat. Its stored messages,
/// read marker, Messages row and Home count follow the series. Today is April 15, 2026: Couch to
/// 5K's April 7 and 14 are past, April 21 is next.
/// </summary>
public sealed class SeriesChatTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    private async Task<(HttpClient Client, string Cookie, Guid Id)> MemberAsync(string email)
    {
        var (client, cookie) = await MemberSeries.MemberAsync(factory, email);
        return (client, cookie, await MemberSeries.MemberIdAsync(factory, email));
    }

    private async Task<(Domain.Events.EventSeries Series, IReadOnlyList<Guid> Sessions)> CouchAsync(string title)
    {
        var series = AdminSeries.NewSeries(title, factory.Time.GetUtcNow());
        return (series, await factory.AddCouchTo5KAsync(series));
    }

    [Fact]
    public async Task Given_a_member_who_joined_and_one_who_holds_a_later_date_When_one_sends_to_the_series_chat_Then_both_receive_it_under_the_series_id()
    {
        var (series, sessions) = await CouchAsync("Couch to 5K Chat");
        var (_, graceCookie, graceId) = await MemberAsync("grace.series.chat@example.org");
        var (_, hopeCookie, hopeId) = await MemberAsync("hope.series.chat@example.org");
        await MemberSeries.EnrolAsync(factory, series, "grace.series.chat@example.org");
        await factory.AddRegistrationsAsync([(sessions[3], hopeId)]);
        await using var grace = await SeriesHub.ConnectAsync(factory, graceCookie);
        await using var hope = await SeriesHub.ConnectAsync(factory, hopeCookie);

        var joined = await grace.JoinAsync(series.Id);
        Assert.Equal(new ChatAnswerBody(null, "Couch to 5K Chat", graceId), joined);
        Assert.Null((await hope.JoinAsync(series.Id)).Code);
        Assert.Null((await grace.SendAsync(series.Id, "Same place as last week")).Code);

        var atHope = await hope.NextAsync("Hope, who holds April 28");
        Assert.Equal(("Same place as last week", series.Id, graceId), (atHope.Text, atHope.EventId, atHope.AuthorId));
        Assert.Equal(atHope, await grace.NextAsync("Grace, who joined and sent it"));
    }

    [Fact]
    public async Task Given_a_member_whose_only_place_was_a_past_date_When_they_join_the_series_chat_Then_it_is_refused_not_a_participant()
    {
        var (series, sessions) = await CouchAsync("Couch to 5K Past Chat");
        var (_, cookie, kaiId) = await MemberAsync("kai.series.chat@example.org");
        await factory.AddRegistrationsAsync([(sessions[0], kaiId)]);
        await using var kai = await SeriesHub.ConnectAsync(factory, cookie);

        Assert.Equal("not_a_participant", (await kai.JoinAsync(series.Id)).Code);
        Assert.Equal("not_a_participant", (await kai.SendAsync(series.Id, "Anyone there?")).Code);
    }

    [Fact]
    public async Task Given_a_member_with_a_place_at_a_session_When_they_join_by_the_sessions_own_id_Then_it_is_refused_not_a_participant()
    {
        var (_, sessions) = await CouchAsync("Couch to 5K Session Chat");
        var (_, cookie, maeId) = await MemberAsync("mae.series.chat@example.org");
        await factory.AddRegistrationsAsync([(sessions[2], maeId)]);
        await using var mae = await SeriesHub.ConnectAsync(factory, cookie);

        Assert.Equal("not_a_participant", (await mae.JoinAsync(sessions[2])).Code);
    }

    [Fact]
    public async Task Given_a_message_in_the_series_chat_When_a_member_reads_it_Then_history_Messages_and_Home_follow_the_series()
    {
        var (series, sessions) = await CouchAsync("Couch to 5K History");
        var (_, graceCookie, _) = await MemberAsync("grace.series.history@example.org");
        var (hopeClient, hopeCookie, hopeId) = await MemberAsync("hope.series.history@example.org");
        await MemberSeries.EnrolAsync(factory, series, "grace.series.history@example.org");
        await factory.AddRegistrationsAsync([(sessions[2], hopeId), (sessions[3], hopeId)]);
        await using var grace = await SeriesHub.ConnectAsync(factory, graceCookie);
        await grace.JoinAsync(series.Id);
        await grace.SendAsync(series.Id, "Bring water");
        await grace.NextAsync("Grace, who sent it");

        var unreadBefore = await JsonAsync(hopeClient, hopeCookie, "/api/home");
        var history = await JsonAsync(hopeClient, hopeCookie, $"/api/events/{series.Id}/chat/messages");
        var rowBefore = SeriesRow(await JsonAsync(hopeClient, hopeCookie, "/api/conversations"), series.Id);
        using var read = await Browser.SendAsync(hopeClient, HttpMethod.Post, $"/api/events/{series.Id}/chat/read", hopeCookie);
        var rowAfter = SeriesRow(await JsonAsync(hopeClient, hopeCookie, "/api/conversations"), series.Id);

        Assert.Equal(1, unreadBefore.GetProperty("unreadCount").GetInt32());
        Assert.Equal(["Bring water"], history.GetProperty("messages").EnumerateArray().Select(m => m.GetProperty("text").GetString()));
        Assert.Equal(series.Id, history.GetProperty("messages")[0].GetProperty("eventId").GetGuid());
        Assert.False(history.GetProperty("cancelled").GetBoolean());
        Assert.Equal(HttpStatusCode.NoContent, read.StatusCode);
        Assert.Equal(
            // The 31 who joined Couch to 5K, Grace who joined, and Hope who holds two dates: 33 members.
            ("series", "Couch to 5K History", 33, "Bring water", 1),
            (rowBefore.GetProperty("kind").GetString(), rowBefore.GetProperty("name").GetString(), rowBefore.GetProperty("memberCount").GetInt32(),
                rowBefore.GetProperty("lastMessage").GetProperty("text").GetString(), rowBefore.GetProperty("unreadCount").GetInt32()));
        Assert.Equal(0, rowAfter.GetProperty("unreadCount").GetInt32());
        Assert.Equal(0, (await JsonAsync(hopeClient, hopeCookie, "/api/home")).GetProperty("unreadCount").GetInt32());
        // Hope holds two dates of the series and has one conversation for it, not one per date.
        var rows = (await JsonAsync(hopeClient, hopeCookie, "/api/conversations")).GetProperty("conversations").EnumerateArray().ToList();
        Assert.Single(rows);
    }

    [Fact]
    public async Task Given_a_member_who_dropped_in_on_one_date_When_they_give_up_that_place_Then_they_leave_the_series_chat()
    {
        var (series, sessions) = await CouchAsync("Couch to 5K Drop Out");
        var (_, graceCookie, _) = await MemberAsync("grace.series.dropout@example.org");
        var (hopeClient, hopeCookie, _) = await MemberAsync("hope.series.dropout@example.org");
        await MemberSeries.EnrolAsync(factory, series, "grace.series.dropout@example.org");
        using var registered = await Browser.SendAsync(hopeClient, HttpMethod.Post, $"/api/events/{sessions[3]}/registrations", hopeCookie);
        Assert.Equal(HttpStatusCode.OK, registered.StatusCode);
        await using var grace = await SeriesHub.ConnectAsync(factory, graceCookie);
        await using var hope = await SeriesHub.ConnectAsync(factory, hopeCookie);
        await grace.JoinAsync(series.Id);
        Assert.Null((await hope.JoinAsync(series.Id)).Code);

        using var cancelled = await Browser.SendAsync(hopeClient, HttpMethod.Delete, $"/api/events/{sessions[3]}/registrations/me", hopeCookie);
        Assert.Equal(HttpStatusCode.OK, cancelled.StatusCode);
        await grace.SendAsync(series.Id, "See you Tuesday");

        // Grace, still in the chat, is the proof the message went out; Hope, who left, has none.
        Assert.Equal("See you Tuesday", (await grace.NextAsync("Grace, who joined")).Text);
        Assert.False(hope.Received.Reader.TryRead(out var stray), $"Hope, who left, received: {stray?.Text}");
    }

    private static async Task<JsonElement> JsonAsync(HttpClient client, string cookie, string path)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, path, cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private static JsonElement SeriesRow(JsonElement list, Guid seriesId) =>
        list.GetProperty("conversations").EnumerateArray().Single(c => c.GetProperty("id").GetGuid() == seriesId);
}
