using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Profiles;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-012 (ADR 0034): a registered member gives up their place before the event starts and it frees
/// for others; once the event has started the cancel is refused with <c>event_started</c>.
/// </summary>
public sealed class CancelRegistrationTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private static string PathOf(Guid id) => $"/api/events/{id}";

    private static string RegisterPath(Guid id) => $"/api/events/{id}/registrations";

    private static string CancelPath(Guid id) => $"/api/events/{id}/registrations/me";

    private async Task<(HttpClient Client, string Cookie)> MemberAsync(string email)
    {
        var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        return (client, cookie);
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, string cookie, HttpMethod method, string path, HttpStatusCode expected)
    {
        using var response = await Browser.SendAsync(client, method, path, cookie);
        Assert.Equal(expected, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Given_nobody_signed_in_When_cancelling_Then_it_is_unauthorized()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Delete, CancelPath(Guid.NewGuid()), cookie: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_registered_member_before_the_start_When_they_cancel_Then_going_falls_by_one_and_they_hold_no_place()
    {
        var id = await factory.AddEventAsync("Cancel Run");
        var (grace, graceCookie) = await MemberAsync("grace.cancel@example.org");
        var (hope, hopeCookie) = await MemberAsync("hope.cancel@example.org");
        await ReadAsync(grace, graceCookie, HttpMethod.Post, RegisterPath(id), HttpStatusCode.OK);
        await ReadAsync(hope, hopeCookie, HttpMethod.Post, RegisterPath(id), HttpStatusCode.OK);

        var cancelled = await ReadAsync(grace, graceCookie, HttpMethod.Delete, CancelPath(id), HttpStatusCode.OK);
        var graceView = await ReadAsync(grace, graceCookie, HttpMethod.Get, PathOf(id), HttpStatusCode.OK);
        var hopeView = await ReadAsync(hope, hopeCookie, HttpMethod.Get, PathOf(id), HttpStatusCode.OK);

        Assert.Equal((1, JsonValueKind.Null), (cancelled.GetProperty("going").GetInt32(), cancelled.GetProperty("registration").ValueKind));
        Assert.Equal((1, JsonValueKind.Null), (graceView.GetProperty("going").GetInt32(), graceView.GetProperty("registration").ValueKind));
        Assert.Equal((1, "confirmed"), (hopeView.GetProperty("going").GetInt32(), hopeView.GetProperty("registration").GetString()));
    }

    [Fact]
    public async Task Given_a_full_event_When_a_member_cancels_Then_another_member_can_take_the_place()
    {
        var id = await factory.AddEventAsync("Swap Run", capacity: 1);
        var (grace, graceCookie) = await MemberAsync("grace.swap@example.org");
        var (hope, hopeCookie) = await MemberAsync("hope.swap@example.org");
        await ReadAsync(grace, graceCookie, HttpMethod.Post, RegisterPath(id), HttpStatusCode.OK);
        await ReadAsync(hope, hopeCookie, HttpMethod.Post, RegisterPath(id), HttpStatusCode.Conflict);

        await ReadAsync(grace, graceCookie, HttpMethod.Delete, CancelPath(id), HttpStatusCode.OK);
        var taken = await ReadAsync(hope, hopeCookie, HttpMethod.Post, RegisterPath(id), HttpStatusCode.OK);

        Assert.Equal((1, "confirmed"), (taken.GetProperty("going").GetInt32(), taken.GetProperty("registration").GetString()));
    }

    [Fact]
    public async Task Given_a_member_with_no_registration_When_they_cancel_Then_nothing_changes()
    {
        var id = await factory.AddEventAsync("Nothing Run");
        var (grace, graceCookie) = await MemberAsync("grace.nothing@example.org");
        var (hope, hopeCookie) = await MemberAsync("hope.nothing@example.org");
        await ReadAsync(hope, hopeCookie, HttpMethod.Post, RegisterPath(id), HttpStatusCode.OK);

        var cancelled = await ReadAsync(grace, graceCookie, HttpMethod.Delete, CancelPath(id), HttpStatusCode.OK);

        Assert.Equal((1, JsonValueKind.Null), (cancelled.GetProperty("going").GetInt32(), cancelled.GetProperty("registration").ValueKind));
    }

    [Fact]
    public async Task Given_the_event_has_started_When_a_member_cancels_Then_it_is_refused_event_started_and_the_place_stays()
    {
        var id = await factory.AddEventAsync("Started Run", startsIn: TimeSpan.FromHours(1));
        var (grace, graceCookie) = await MemberAsync("grace.started@example.org");
        await ReadAsync(grace, graceCookie, HttpMethod.Post, RegisterPath(id), HttpStatusCode.OK);
        factory.Time.Advance(TimeSpan.FromHours(1));

        var refusal = await ReadAsync(grace, graceCookie, HttpMethod.Delete, CancelPath(id), HttpStatusCode.Conflict);
        var view = await ReadAsync(grace, graceCookie, HttpMethod.Get, PathOf(id), HttpStatusCode.OK);

        Assert.Equal("event_started", refusal.GetProperty("code").GetString());
        Assert.Equal((1, "confirmed"), (view.GetProperty("going").GetInt32(), view.GetProperty("registration").GetString()));
    }

    [Fact]
    public async Task Given_a_draft_or_unknown_event_When_a_member_cancels_Then_it_is_not_found()
    {
        var draft = await factory.AddEventAsync("Draft Cancel Run", published: false);
        var (client, cookie) = await MemberAsync("grace.cancelnotfound@example.org");

        var forDraft = await ReadAsync(client, cookie, HttpMethod.Delete, CancelPath(draft), HttpStatusCode.NotFound);
        var forUnknown = await ReadAsync(client, cookie, HttpMethod.Delete, CancelPath(Guid.NewGuid()), HttpStatusCode.NotFound);

        Assert.Equal(("event_not_found", "event_not_found"), (forDraft.GetProperty("code").GetString(), forUnknown.GetProperty("code").GetString()));
    }
}
