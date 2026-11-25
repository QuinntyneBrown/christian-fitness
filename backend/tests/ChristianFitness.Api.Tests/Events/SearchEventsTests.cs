using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Events;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-075 AC2 to AC4 (ADR 0081): a member narrows the date list to titles that contain the trimmed
/// search, in any case, with the category still applying; blank text narrows nothing. Each test
/// searches for a word only its own events carry, since the store is the class's.
/// </summary>
public sealed class SearchEventsTests(BrowseEventsFactory factory) : IClassFixture<BrowseEventsFactory>
{
    private static readonly DateTimeOffset Soon = BrowseEventsFactory.Now.AddDays(3);

    internal static async Task<JsonElement> SearchAsync(HttpClient client, string cookie, string query)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{BrowseEvents.Path}?{query}", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    internal static List<string?> IdsOf(JsonElement page) =>
        [.. page.GetProperty("events").EnumerateArray().Select(e => e.GetProperty("id").GetString())];

    [Fact]
    public async Task Given_events_with_and_without_the_word_When_a_member_searches_padded_upper_case_text_Then_only_published_upcoming_matches_show_soonest_first()
    {
        var later = await factory.AddEventAsync("Quartz Sunrise Stretch", Soon.AddDays(2), category: EventCategory.Workout);
        var sooner = await factory.AddEventAsync("Easter quartz 5K", Soon);
        await factory.AddEventAsync("Saturday Park Bootcamp", Soon.AddHours(1));
        await factory.AddEventAsync("Quartz Draft", Soon.AddHours(2), published: false);
        await factory.AddEventAsync("Quartz Started", BrowseEventsFactory.Now.AddHours(-1));
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.search.quartz@example.org");

        var page = await SearchAsync(client, cookie, $"q={Uri.EscapeDataString("  QUARTZ ")}");

        Assert.Equal([sooner.ToString(), later.ToString()], IdsOf(page));
    }

    [Fact]
    public async Task Given_a_search_and_a_category_When_a_member_asks_Then_both_apply()
    {
        await factory.AddEventAsync("Basalt Run", Soon, category: EventCategory.Run);
        var workout = await factory.AddEventAsync("Basalt Circuits", Soon.AddHours(1), category: EventCategory.Workout);
        await factory.AddEventAsync("Other Circuits", Soon.AddHours(2), category: EventCategory.Workout);
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.search.basalt@example.org");

        var page = await SearchAsync(client, cookie, "q=basalt&category=workout");

        Assert.Equal([workout.ToString()], IdsOf(page));
    }

    [Theory]
    [InlineData("")]
    [InlineData("%20%20%20")]
    public async Task Given_blank_search_text_When_a_member_asks_Then_the_list_is_not_narrowed(string q)
    {
        await factory.AddEventAsync($"Slate {q.Length}", Soon);
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, $"grace.search.blank.{q.Length}@example.org");
        var unsearched = await BrowseEvents.PageAsync(client, cookie);

        var page = await SearchAsync(client, cookie, $"q={q}");

        Assert.Equal(IdsOf(unsearched), IdsOf(page));
        Assert.NotEmpty(IdsOf(page));
    }

    [Fact]
    public async Task Given_percent_and_underscore_in_the_search_When_a_member_asks_Then_they_match_only_themselves()
    {
        var literal = await factory.AddEventAsync("Gneiss 100% effort", Soon);
        await factory.AddEventAsync("Gneiss 100 laps", Soon.AddHours(1));
        var relay = await factory.AddEventAsync("Gneiss_relay", Soon.AddHours(2));
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.search.gneiss@example.org");

        var percent = await SearchAsync(client, cookie, $"q={Uri.EscapeDataString("gneiss 100%")}");
        var underscore = await SearchAsync(client, cookie, $"q={Uri.EscapeDataString("gneiss_")}");

        Assert.Equal([literal.ToString()], IdsOf(percent));
        Assert.Equal([relay.ToString()], IdsOf(underscore));
    }
}

/// <summary>L2-075 AC4 (ADR 0081): a search pages by its own cursor, 20 then the rest, with no other event. Its own store.</summary>
public sealed class SearchEventsPagingTests(BrowseEventsFactory factory) : IClassFixture<BrowseEventsFactory>
{
    [Fact]
    public async Task Given_25_matches_among_other_events_When_a_member_pages_the_search_Then_it_gets_20_then_5_matches_only()
    {
        var matches = new List<string?>();
        for (var i = 0; i < 25; i++)
        {
            matches.Add((await factory.AddEventAsync($"Pumice Run {i:00}", BrowseEventsFactory.Now.AddDays(1).AddMinutes(i * 2))).ToString());
            await factory.AddEventAsync($"Other Run {i:00}", BrowseEventsFactory.Now.AddDays(1).AddMinutes((i * 2) + 1));
        }

        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.search.paging@example.org");

        var first = await SearchEventsTests.SearchAsync(client, cookie, "q=pumice");
        var cursor = first.GetProperty("nextCursor").GetString()!;
        var second = await SearchEventsTests.SearchAsync(client, cookie, $"q=pumice&cursor={Uri.EscapeDataString(cursor)}");

        Assert.Equal((20, 5), (SearchEventsTests.IdsOf(first).Count, SearchEventsTests.IdsOf(second).Count));
        Assert.Equal(JsonValueKind.Null, second.GetProperty("nextCursor").ValueKind);
        Assert.Equal(matches, SearchEventsTests.IdsOf(first).Concat(SearchEventsTests.IdsOf(second)));
    }
}
