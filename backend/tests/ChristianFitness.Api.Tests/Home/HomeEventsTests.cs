using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Events;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Home;

/// <summary>The API on a clock the tests hold, with events a test puts in the store through the domain (ADR 0044).</summary>
public sealed class HomeFactory : ApiFactory
{
    public static readonly DateTimeOffset Now = new(2026, 4, 15, 12, 45, 0, TimeSpan.Zero);

    public FakeTimeProvider Time { get; } = new(Now);

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(Time);
    }

    /// <summary>An event that starts <paramref name="startsIn"/> from now: published, a draft, or cancelled.</summary>
    public async Task<Guid> AddEventAsync(string title, TimeSpan startsIn, EventCategory category = EventCategory.Run, EventStatus status = EventStatus.Published)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var e = Event.CreateDraft(title, category, Now + startsIn, "Martin Goodman Trail", "Waterfront, Toronto", 0, 50, "Come run with us.", Now.AddDays(-30));
        if (status != EventStatus.Draft)
        {
            e.Publish(e.CreatedAt);
        }

        if (status == EventStatus.Cancelled)
        {
            e.Cancel();
        }

        db.Events.Add(e);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return e.Id;
    }
}

/// <summary>
/// L2-007 AC1 and AC2 (ADR 0044): Home answers the member's next registered event, and up to three
/// published upcoming events of the categories their interests name that they are not going to,
/// soonest first. A joined member follows running and strength, so Run and Workout events suit them.
/// </summary>
public sealed class HomeEventsTests(HomeFactory factory) : IClassFixture<HomeFactory>
{
    private const string Path = "/api/home";

    private static readonly TimeSpan Day = TimeSpan.FromDays(1);

    private async Task<(HttpClient Client, string Cookie)> MemberAsync(string email)
    {
        var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        return (client, cookie);
    }

    private static async Task<JsonElement> HomeAsync(HttpClient client, string cookie)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, Path, cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private static async Task RegisterAsync(HttpClient client, string cookie, Guid id)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Post, $"/api/events/{id}/registrations", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static string?[] Ids(JsonElement home) =>
        [.. home.GetProperty("suggested").EnumerateArray().Select(e => e.GetProperty("id").GetString())];

    [Fact]
    public async Task Given_nobody_signed_in_When_Home_is_asked_for_Then_it_is_unauthorized()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, Path, cookie: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_member_going_to_two_events_When_Home_is_asked_for_Then_the_next_is_the_soonest_that_has_not_started()
    {
        var later = await factory.AddEventAsync("Later Run", 6 * Day);
        var sooner = await factory.AddEventAsync("Sooner Run", 3 * Day, EventCategory.Mobility);
        var (client, cookie) = await MemberAsync("grace.home.next@example.org");
        await RegisterAsync(client, cookie, later);
        await RegisterAsync(client, cookie, sooner);

        var home = await HomeAsync(client, cookie);

        var next = home.GetProperty("nextEvent");
        Assert.Equal(sooner.ToString(), next.GetProperty("id").GetString());
        Assert.Equal(
            ["area", "capacity", "category", "going", "id", "imageKey", "place", "priceCents", "series", "startsAt", "title"],
            next.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        // A standalone event is part of no series (ADR 0093).
        Assert.Equal(JsonValueKind.Null, next.GetProperty("series").ValueKind);
        Assert.Equal((1, "mobility"), (next.GetProperty("going").GetInt32(), next.GetProperty("category").GetString()));
    }

    [Fact]
    public async Task Given_the_only_registered_event_was_cancelled_When_Home_is_asked_for_Then_there_is_no_next_event()
    {
        var cancelled = await factory.AddEventAsync("Cancelled Run", 2 * Day);
        var (client, cookie) = await MemberAsync("grace.home.cancelled@example.org");
        await RegisterAsync(client, cookie, cancelled);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var e = await db.Events.FindAsync([cancelled], TestContext.Current.CancellationToken);
            e!.Cancel();
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        var home = await HomeAsync(client, cookie);

        Assert.Equal(JsonValueKind.Null, home.GetProperty("nextEvent").ValueKind);
    }

    [Fact]
    public async Task Given_no_registrations_When_Home_is_asked_for_Then_there_is_no_next_event()
    {
        var (client, cookie) = await MemberAsync("grace.home.none@example.org");

        var home = await HomeAsync(client, cookie);

        Assert.Equal(JsonValueKind.Null, home.GetProperty("nextEvent").ValueKind);
    }

    [Fact]
    public async Task Given_events_that_suit_and_do_not_suit_When_Home_is_asked_for_Then_only_the_published_upcoming_matching_ones_they_are_not_going_to_are_suggested()
    {
        var going = await factory.AddEventAsync("Going Run", 1 * Day + TimeSpan.FromHours(1));
        var run = await factory.AddEventAsync("Matching Run", 2 * Day);
        var workout = await factory.AddEventAsync("Matching Workout", 3 * Day, EventCategory.Workout);
        // A third match, so three events that match always outrank the one that does not, whichever
        // of the class's tests ran first.
        await factory.AddEventAsync("Another Matching Run", 4 * Day);
        await factory.AddEventAsync("Basketball Night", 1 * Day, EventCategory.Basketball);
        await factory.AddEventAsync("Draft Run", 1 * Day, status: EventStatus.Draft);
        await factory.AddEventAsync("Cancelled Run", 1 * Day, status: EventStatus.Cancelled);
        await factory.AddEventAsync("Started Run", -TimeSpan.FromHours(1));
        var (client, cookie) = await MemberAsync("grace.home.suggested@example.org");
        await RegisterAsync(client, cookie, going);

        var home = await HomeAsync(client, cookie);

        Assert.Equal([run.ToString(), workout.ToString()], Ids(home).Where(id => id == run.ToString() || id == workout.ToString()));
        Assert.DoesNotContain(going.ToString(), Ids(home));
        var titles = home.GetProperty("suggested").EnumerateArray().Select(e => e.GetProperty("title").GetString()).ToList();
        // An event matching no interest ranks after every one that does (L2-065 AC7; ADR 0076), so
        // with three that match it never reaches the three suggested.
        Assert.DoesNotContain("Basketball Night", titles);
        Assert.DoesNotContain("Draft Run", titles);
        Assert.DoesNotContain("Cancelled Run", titles);
        Assert.DoesNotContain("Started Run", titles);
    }
}

/// <summary>L2-007 AC1 (ADR 0044): never more than three suggestions, the three soonest. Its own store.</summary>
public sealed class HomeSuggestionLimitTests(HomeFactory factory) : IClassFixture<HomeFactory>
{
    [Fact]
    public async Task Given_five_matching_events_When_Home_is_asked_for_Then_the_three_soonest_are_suggested()
    {
        var ids = new List<string>();
        foreach (var i in new[] { 5, 3, 4, 1, 2 })
        {
            ids.Add((await factory.AddEventAsync($"Run {i}", TimeSpan.FromDays(i))).ToString());
        }

        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("grace.home.limit@example.org"));
        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/home", cookie);

        var home = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(
            [ids[3], ids[4], ids[1]],
            home.GetProperty("suggested").EnumerateArray().Select(e => e.GetProperty("id").GetString()));
    }
}

/// <summary>
/// L2-007 AC1 (ADR 0045): Home answers <c>unreadCount</c> across the member's event group chats
/// and direct messages, leaving out their own messages and messages at or before their read marker.
/// </summary>
public sealed class HomeUnreadTests(HomeFactory factory) : IClassFixture<HomeFactory>
{
    [Fact]
    public async Task Given_no_conversations_When_Home_is_asked_for_Then_unread_count_is_zero()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("grace.home.unread0@example.org"));

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/home", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var home = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(
            ["nextEvent", "suggested", "unreadCount"],
            home.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(0, home.GetProperty("unreadCount").GetInt32());
    }

    [Fact]
    public async Task Given_unread_and_read_group_and_direct_messages_When_Home_is_asked_for_Then_unread_count_sums_only_other_members_unread_messages()
    {
        var eventOne = await factory.AddEventAsync("Sunrise 5K", TimeSpan.FromDays(2));
        var eventTwo = await factory.AddEventAsync("Hoops Night", TimeSpan.FromDays(4), EventCategory.Basketball);
        var otherEvent = await factory.AddEventAsync("Unjoined Run", TimeSpan.FromDays(5));

        using var graceClient = Browser.CreateClient(factory);
        var graceCookie = await OwnProfileTests.JoinedAsync(graceClient, JoinTests.Details("grace.home.unread@example.org"));
        var graceSession = await (await Browser.SendAsync(graceClient, HttpMethod.Get, "/api/session", graceCookie))
            .Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        var graceId = Guid.Parse(graceSession.GetProperty("memberId").GetString()!);

        using var michaelClient = Browser.CreateClient(factory);
        var michaelCookie = await OwnProfileTests.JoinedAsync(michaelClient, JoinTests.Details("michael.home.unread@example.org"));
        var michaelSession = await (await Browser.SendAsync(michaelClient, HttpMethod.Get, "/api/session", michaelCookie))
            .Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        var michaelId = Guid.Parse(michaelSession.GetProperty("memberId").GetString()!);

        foreach (var id in new[] { eventOne, eventTwo })
        {
            Assert.Equal(HttpStatusCode.OK, (await Browser.SendAsync(graceClient, HttpMethod.Post, $"/api/events/{id}/registrations", graceCookie)).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await Browser.SendAsync(michaelClient, HttpMethod.Post, $"/api/events/{id}/registrations", michaelCookie)).StatusCode);
        }
        Assert.Equal(HttpStatusCode.OK, (await Browser.SendAsync(michaelClient, HttpMethod.Post, $"/api/events/{otherEvent}/registrations", michaelCookie)).StatusCode);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var t0 = HomeFactory.Now.AddMinutes(-10);
            db.ChatMessages.Add(ChatMessage.Of(ChatScope.OfEvent(eventOne), michaelId, "Early note", t0));
            db.ChatReadMarkers.Add(ChatReadMarker.Of(graceId, eventOne, t0.AddMinutes(1)));
            db.ChatMessages.Add(ChatMessage.Of(ChatScope.OfEvent(eventOne), michaelId, "Parking fills at 6:30", t0.AddMinutes(2)));
            db.ChatMessages.Add(ChatMessage.Of(ChatScope.OfEvent(eventOne), michaelId, "Meet at the arch", t0.AddMinutes(3)));
            db.ChatMessages.Add(ChatMessage.Of(ChatScope.OfEvent(eventOne), graceId, "On my way", t0.AddMinutes(4)));
            db.ChatMessages.Add(ChatMessage.Of(ChatScope.OfEvent(eventTwo), michaelId, "Who has pinnies?", t0.AddMinutes(5)));
            db.ChatMessages.Add(ChatMessage.Of(ChatScope.OfEvent(otherEvent), michaelId, "Unjoined chat", t0.AddMinutes(5)));
            db.DirectMessages.Add(DirectMessage.Of(michaelId, graceId, "Yesterday note", t0));
            db.ChatReadMarkers.Add(ChatReadMarker.Of(graceId, michaelId, t0.AddMinutes(1)));
            db.DirectMessages.Add(DirectMessage.Of(michaelId, graceId, "See you Thursday!", t0.AddMinutes(2)));
            db.DirectMessages.Add(DirectMessage.Of(graceId, michaelId, "Sounds great!", t0.AddMinutes(3)));
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        using var response = await Browser.SendAsync(graceClient, HttpMethod.Get, "/api/home", graceCookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var home = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);

        Assert.Equal(4, home.GetProperty("unreadCount").GetInt32());
    }
}
