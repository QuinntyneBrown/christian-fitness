using System.Net;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Events;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-076 AC1, AC3 and AC4 (ADR 0081): <c>going=true</c> keeps the published upcoming events the
/// signed-in member holds a registration for, with category and search still applying; the member
/// comes from the session, never from the request. Each test's members and events are its own.
/// </summary>
public sealed class GoingEventsTests(BrowseEventsFactory factory) : IClassFixture<BrowseEventsFactory>
{
    private static readonly DateTimeOffset Soon = BrowseEventsFactory.Now.AddDays(3);

    internal static async Task RegisterAsync(HttpClient client, string cookie, Guid eventId)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Post, $"{BrowseEvents.Path}/{eventId}/registrations", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_member_registered_for_two_events_When_they_ask_for_only_theirs_Then_only_those_show_soonest_first()
    {
        var later = await factory.AddEventAsync("Mine later", Soon.AddDays(2));
        var sooner = await factory.AddEventAsync("Mine sooner", Soon, category: EventCategory.Workout);
        var notMine = await factory.AddEventAsync("Not mine", Soon.AddHours(1));
        var othersOnly = await factory.AddEventAsync("Another member's", Soon.AddHours(2));
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.going.two@example.org");
        var (otherClient, otherCookie) = await BrowseEvents.MemberAsync(factory, "tyler.going.two@example.org");
        await RegisterAsync(client, cookie, later);
        await RegisterAsync(client, cookie, sooner);
        await RegisterAsync(otherClient, otherCookie, othersOnly);

        var mine = await SearchEventsTests.SearchAsync(client, cookie, "going=true");
        var everything = await BrowseEvents.PageAsync(client, cookie);

        Assert.Equal([sooner.ToString(), later.ToString()], SearchEventsTests.IdsOf(mine));
        Assert.Contains(notMine.ToString(), SearchEventsTests.IdsOf(everything));
        Assert.Contains(othersOnly.ToString(), SearchEventsTests.IdsOf(everything));
    }

    [Fact]
    public async Task Given_a_member_id_in_the_request_When_a_member_asks_for_only_theirs_Then_the_session_decides_whose()
    {
        var theirs = await factory.AddEventAsync("Tyler's run", Soon);
        var mine = await factory.AddEventAsync("Grace's run", Soon.AddHours(1));
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.going.spoof@example.org");
        var (otherClient, otherCookie) = await BrowseEvents.MemberAsync(factory, "tyler.going.spoof@example.org");
        await RegisterAsync(client, cookie, mine);
        await RegisterAsync(otherClient, otherCookie, theirs);
        var tylerId = (await OwnProfileTests.MemberIdAsync(otherClient, otherCookie)).ToString();

        var page = await SearchEventsTests.SearchAsync(client, cookie, $"going=true&memberId={tylerId}&member={tylerId}");

        Assert.Equal([mine.ToString()], SearchEventsTests.IdsOf(page));
    }

    [Fact]
    public async Task Given_only_mine_with_a_category_and_a_search_When_a_member_asks_Then_all_three_apply()
    {
        var match = await factory.AddEventAsync("Obsidian Hoops", Soon, category: EventCategory.Basketball);
        var wrongCategory = await factory.AddEventAsync("Obsidian Run", Soon.AddHours(1), category: EventCategory.Run);
        var wrongTitle = await factory.AddEventAsync("Hoops Night", Soon.AddHours(2), category: EventCategory.Basketball);
        await factory.AddEventAsync("Obsidian Hoops Two", Soon.AddHours(3), category: EventCategory.Basketball);
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.going.combined@example.org");
        foreach (var id in new[] { match, wrongCategory, wrongTitle })
        {
            await RegisterAsync(client, cookie, id);
        }

        var page = await SearchEventsTests.SearchAsync(client, cookie, "going=true&category=basketball&q=OBSIDIAN");

        Assert.Equal([match.ToString()], SearchEventsTests.IdsOf(page));
    }

    [Theory]
    [InlineData("going=false")]
    [InlineData("going=")]
    public async Task Given_the_filter_is_not_on_When_a_member_asks_Then_events_are_not_restricted_by_registration(string query)
    {
        var notMine = await factory.AddEventAsync($"Open to all {query}", Soon);
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, $"grace.going.off.{query.Length}@example.org");

        var page = await SearchEventsTests.SearchAsync(client, cookie, query);

        Assert.Contains(notMine.ToString(), SearchEventsTests.IdsOf(page));
    }

    [Fact]
    public async Task Given_a_member_cancelled_their_place_When_they_ask_for_only_theirs_Then_that_event_is_gone()
    {
        var kept = await factory.AddEventAsync("Kept place", Soon);
        var given = await factory.AddEventAsync("Given up place", Soon.AddHours(1));
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.going.cancelled@example.org");
        await RegisterAsync(client, cookie, kept);
        await RegisterAsync(client, cookie, given);
        using (var cancel = await Browser.SendAsync(client, HttpMethod.Delete, $"{BrowseEvents.Path}/{given}/registrations/me", cookie))
        {
            Assert.Equal(HttpStatusCode.OK, cancel.StatusCode);
        }

        var page = await SearchEventsTests.SearchAsync(client, cookie, "going=true");

        Assert.Equal([kept.ToString()], SearchEventsTests.IdsOf(page));
    }
}

/// <summary>L2-076 AC4 (ADR 0081): only mine pages by its own cursor, 20 then the rest. Its own store.</summary>
public sealed class GoingEventsPagingTests(BrowseEventsFactory factory) : IClassFixture<BrowseEventsFactory>
{
    [Fact]
    public async Task Given_25_registrations_among_other_events_When_a_member_pages_only_theirs_Then_it_gets_20_then_5_of_theirs()
    {
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.going.paging@example.org");
        var mine = new List<string?>();
        for (var i = 0; i < 25; i++)
        {
            var id = await factory.AddEventAsync($"Registered {i:00}", BrowseEventsFactory.Now.AddDays(1).AddMinutes(i * 2));
            await factory.AddEventAsync($"Unregistered {i:00}", BrowseEventsFactory.Now.AddDays(1).AddMinutes((i * 2) + 1));
            await GoingEventsTests.RegisterAsync(client, cookie, id);
            mine.Add(id.ToString());
        }

        var first = await SearchEventsTests.SearchAsync(client, cookie, "going=true");
        var cursor = first.GetProperty("nextCursor").GetString()!;
        var second = await SearchEventsTests.SearchAsync(client, cookie, $"going=true&cursor={Uri.EscapeDataString(cursor)}");

        Assert.Equal((20, 5), (SearchEventsTests.IdsOf(first).Count, SearchEventsTests.IdsOf(second).Count));
        Assert.Equal(mine, SearchEventsTests.IdsOf(first).Concat(SearchEventsTests.IdsOf(second)));
    }
}
