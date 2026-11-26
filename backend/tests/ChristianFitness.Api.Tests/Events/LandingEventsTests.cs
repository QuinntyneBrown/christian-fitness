using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>What the landing tests ask the API: no cookie, as a visitor.</summary>
internal static class Landing
{
    public const string Path = "/api/public/events/upcoming?take=4";

    public static async Task<JsonElement> AskAsync(HttpClient client, string path = Path)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, path, cookie: null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }
}

/// <summary>
/// L2-001 AC5 (ADR 0037, ADR 0105): a visitor with no session gets the next four published events,
/// soonest first, whatever more it asks for; a draft and an event that has started never appear,
/// and each answers only its public fields, its area among them.
/// </summary>
public sealed class LandingEventsTests(BrowseEventsFactory factory) : IClassFixture<BrowseEventsFactory>
{
    [Fact]
    public async Task Given_a_visitor_When_upcoming_events_are_asked_for_Then_the_next_four_published_come_soonest_first_with_public_fields_only()
    {
        var now = BrowseEventsFactory.Now;
        await factory.AddEventAsync("Draft", now.AddDays(1), published: false);
        await factory.AddEventAsync("Started", now.AddHours(-2));
        await factory.AddEventAsync("Fifth", now.AddDays(5));
        var fourth = await factory.AddEventAsync("Fourth", now.AddDays(4));
        var second = await factory.AddEventAsync("Second", now.AddDays(2), area: "Scarborough");
        var first = await factory.AddEventAsync("First", now.AddDays(1));
        var third = await factory.AddEventAsync("Third", now.AddDays(3));
        using var client = Browser.CreateClient(factory);

        var answer = await Landing.AskAsync(client);
        var askedForMore = await Landing.AskAsync(client, "/api/public/events/upcoming?take=9");

        var events = answer.EnumerateArray().ToList();
        Assert.Equal([first.ToString(), second.ToString(), third.ToString(), fourth.ToString()], events.Select(e => e.GetProperty("id").GetString()));
        Assert.Equal(events.Select(e => e.GetProperty("id").GetString()), askedForMore.EnumerateArray().Select(e => e.GetProperty("id").GetString()));
        Assert.Equal(["area", "category", "id", "place", "startsAt", "title"], events[0].EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(
            ("First", "run", "Martin Goodman Trail", "Waterfront, Toronto"),
            (events[0].GetProperty("title").GetString(), events[0].GetProperty("category").GetString(), events[0].GetProperty("place").GetString(), events[0].GetProperty("area").GetString()));
        Assert.Equal("Scarborough", events[1].GetProperty("area").GetString());
    }
}

/// <summary>L2-001 AC6: fewer than four upcoming events answer only those.</summary>
public sealed class LandingFewEventsTests(BrowseEventsFactory factory) : IClassFixture<BrowseEventsFactory>
{
    [Fact]
    public async Task Given_two_upcoming_events_When_asked_for_Then_two_come()
    {
        await factory.AddEventAsync("Only", BrowseEventsFactory.Now.AddDays(1));
        await factory.AddEventAsync("Other", BrowseEventsFactory.Now.AddDays(2));
        using var client = Browser.CreateClient(factory);

        var answer = await Landing.AskAsync(client);

        Assert.Equal(2, answer.GetArrayLength());
    }
}

/// <summary>L2-001 AC6: no upcoming events answer an empty list.</summary>
public sealed class LandingNoEventsTests(BrowseEventsFactory factory) : IClassFixture<BrowseEventsFactory>
{
    [Fact]
    public async Task Given_only_a_draft_When_asked_for_Then_the_list_is_empty()
    {
        await factory.AddEventAsync("Draft", BrowseEventsFactory.Now.AddDays(1), published: false);
        using var client = Browser.CreateClient(factory);

        var answer = await Landing.AskAsync(client);

        Assert.Equal(0, answer.GetArrayLength());
    }
}
