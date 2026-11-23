using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Events;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-009 AC2, AC3 and AC10 (ADR 0030): a member narrows the list to one category, an unknown
/// category is refused with <c>category_invalid</c>, and the cursor pages inside the category. Its
/// own store, so the events of each category are the test's.
/// </summary>
public sealed class BrowseEventsCategoryTests(BrowseEventsFactory factory) : IClassFixture<BrowseEventsFactory>
{
    private static readonly DateTimeOffset Soon = BrowseEventsFactory.Now.AddDays(3);

    private static async Task<JsonElement> CategoryPageAsync(HttpClient client, string cookie, string category, string? cursor = null)
    {
        var path = $"{BrowseEvents.Path}?category={Uri.EscapeDataString(category)}"
            + (cursor is null ? string.Empty : $"&cursor={Uri.EscapeDataString(cursor)}");
        using var response = await Browser.SendAsync(client, HttpMethod.Get, path, cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    [Theory]
    [InlineData("run", EventCategory.Run)]
    [InlineData("workout", EventCategory.Workout)]
    [InlineData("basketball", EventCategory.Basketball)]
    [InlineData("mobility", EventCategory.Mobility)]
    [InlineData("workshop", EventCategory.Workshop)]
    [InlineData("retreat", EventCategory.Retreat)]
    public async Task Given_events_of_every_category_When_a_member_asks_for_one_Then_only_its_events_are_listed(string name, EventCategory category)
    {
        var added = new Dictionary<EventCategory, Guid>();
        foreach (var (each, index) in Enum.GetValues<EventCategory>().Select((c, i) => (c, i)))
        {
            added[each] = await factory.AddEventAsync($"{each} event", Soon.AddHours(index), category: each);
        }

        var (client, cookie) = await BrowseEvents.MemberAsync(factory, $"grace.category.{name}@example.org");

        var page = await CategoryPageAsync(client, cookie, name);

        var events = page.GetProperty("events").EnumerateArray().ToList();
        Assert.Contains(added[category].ToString(), events.Select(e => e.GetProperty("id").GetString()));
        Assert.All(events, e => Assert.Equal(name, e.GetProperty("category").GetString()));
    }

    [Theory]
    [InlineData("yoga")]
    [InlineData("RUN")]
    public async Task Given_a_category_the_API_does_not_know_When_a_member_asks_Then_it_is_refused_with_category_invalid(string category)
    {
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, $"grace.category.bad.{category.Length}{category}@example.org");

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{BrowseEvents.Path}?category={Uri.EscapeDataString(category)}", cookie);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal("category_invalid", problem.GetProperty("fieldCodes").GetProperty("category").GetString());
    }
}

/// <summary>L2-009 AC2 and AC5 (ADR 0030): a category pages by its own cursor, 20 then the rest. Its own store.</summary>
public sealed class BrowseEventsCategoryPagingTests(BrowseEventsFactory factory) : IClassFixture<BrowseEventsFactory>
{
    [Fact]
    public async Task Given_25_runs_among_other_events_When_a_member_pages_the_run_category_Then_it_gets_20_then_5_runs_only()
    {
        var runs = new List<string>();
        for (var i = 0; i < 25; i++)
        {
            runs.Add((await factory.AddEventAsync($"Run {i:00}", BrowseEventsFactory.Now.AddDays(1).AddMinutes(i * 2), category: EventCategory.Run)).ToString());
            await factory.AddEventAsync($"Workout {i:00}", BrowseEventsFactory.Now.AddDays(1).AddMinutes((i * 2) + 1), category: EventCategory.Workout);
        }

        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.category.paging@example.org");

        var first = await Page(client, cookie, null);
        var second = await Page(client, cookie, first.GetProperty("nextCursor").GetString());

        Assert.Equal((20, 5), (first.GetProperty("events").GetArrayLength(), second.GetProperty("events").GetArrayLength()));
        Assert.Equal(JsonValueKind.Null, second.GetProperty("nextCursor").ValueKind);
        Assert.Equal(
            runs,
            first.GetProperty("events").EnumerateArray().Concat(second.GetProperty("events").EnumerateArray()).Select(e => e.GetProperty("id").GetString()));
    }

    private static async Task<JsonElement> Page(HttpClient client, string cookie, string? cursor)
    {
        var path = $"{BrowseEvents.Path}?category=run" + (cursor is null ? string.Empty : $"&cursor={Uri.EscapeDataString(cursor)}");
        using var response = await Browser.SendAsync(client, HttpMethod.Get, path, cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }
}

/** L2-009 AC3 (ADR 0030): a category with no events answers an empty list, not a refusal. Its own store. */
public sealed class BrowseEventsNoMatchTests(BrowseEventsFactory factory) : IClassFixture<BrowseEventsFactory>
{
    [Fact]
    public async Task Given_only_a_run_When_a_member_asks_for_workshops_Then_the_list_is_empty_and_has_no_next_cursor()
    {
        await factory.AddEventAsync("Only run", BrowseEventsFactory.Now.AddDays(2), category: EventCategory.Run);
        await factory.AddEventAsync("Draft workshop", BrowseEventsFactory.Now.AddDays(2), published: false, category: EventCategory.Workshop);
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.category.nomatch@example.org");

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{BrowseEvents.Path}?category=workshop", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal((0, JsonValueKind.Null), (page.GetProperty("events").GetArrayLength(), page.GetProperty("nextCursor").ValueKind));
    }
}
