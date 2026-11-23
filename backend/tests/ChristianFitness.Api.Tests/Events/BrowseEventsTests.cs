using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Events;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>What the browse tests ask the API, shared by the classes below.</summary>
internal static class BrowseEvents
{
    public const string Path = "/api/events";

    public static async Task<(HttpClient Client, string Cookie)> MemberAsync(BrowseEventsFactory factory, string email)
    {
        var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        return (client, cookie);
    }

    public static async Task<JsonElement> PageAsync(HttpClient client, string cookie, string? cursor = null)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, cursor is null ? Path : $"{Path}?cursor={Uri.EscapeDataString(cursor)}", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    /// <summary>The ids of each page, following the cursor until there is none (at most 10 pages).</summary>
    public static async Task<List<List<string>>> AllPagesAsync(HttpClient client, string cookie)
    {
        var pages = new List<List<string>>();
        string? cursor = null;
        do
        {
            var page = await PageAsync(client, cookie, cursor);
            pages.Add([.. page.GetProperty("events").EnumerateArray().Select(e => e.GetProperty("id").GetString()!)]);
            cursor = page.GetProperty("nextCursor").GetString();
        }
        while (cursor is not null && pages.Count < 10);
        return pages;
    }
}

/// <summary>
/// L2-009 AC1 and AC4 (ADR 0027): a signed-in member lists the published events that have not
/// started, soonest first; a draft and an event that has started never appear. Each test reads only
/// the events it added, since the store is the class's.
/// </summary>
public sealed class BrowseEventsTests(BrowseEventsFactory factory) : IClassFixture<BrowseEventsFactory>
{
    private static readonly DateTimeOffset Soon = BrowseEventsFactory.Now.AddDays(3);

    [Fact]
    public async Task Given_nobody_signed_in_When_events_are_asked_for_Then_it_is_unauthorized()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, BrowseEvents.Path, cookie: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Given_published_events_When_a_member_lists_them_Then_each_answers_exactly_its_fields_soonest_first()
    {
        var later = await factory.AddEventAsync("Later Run", Soon.AddDays(5), category: EventCategory.Workout, priceCents: 1000, capacity: 50, imageKey: "0123456789abcdef0123456789abcdef.jpg");
        var sooner = await factory.AddEventAsync("Sooner Run", Soon, category: EventCategory.Run);
        factory.Going[later] = 38;
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.browse@example.org");

        var page = await BrowseEvents.PageAsync(client, cookie);

        var ours = page.GetProperty("events").EnumerateArray().Where(e => e.GetProperty("id").GetString() is { } id && (id == later.ToString() || id == sooner.ToString())).ToList();
        Assert.Equal([sooner.ToString(), later.ToString()], ours.Select(e => e.GetProperty("id").GetString()));
        Assert.Equal(
            ["area", "capacity", "category", "going", "id", "imageKey", "place", "priceCents", "startsAt", "title"],
            ours[1].EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(("Later Run", "workout", 1000, 50, 38, "0123456789abcdef0123456789abcdef.jpg"), (
            ours[1].GetProperty("title").GetString(),
            ours[1].GetProperty("category").GetString(),
            ours[1].GetProperty("priceCents").GetInt32(),
            ours[1].GetProperty("capacity").GetInt32(),
            ours[1].GetProperty("going").GetInt32(),
            ours[1].GetProperty("imageKey").GetString()));
        Assert.Equal(Soon.AddDays(5), ours[1].GetProperty("startsAt").GetDateTimeOffset());
        Assert.Equal((0, JsonValueKind.Null), (ours[0].GetProperty("going").GetInt32(), ours[0].GetProperty("imageKey").ValueKind));
    }

    [Fact]
    public async Task Given_a_draft_and_an_event_that_has_started_When_a_member_lists_events_Then_neither_appears()
    {
        var draft = await factory.AddEventAsync("Hidden Draft", Soon, published: false);
        var started = await factory.AddEventAsync("Started Already", BrowseEventsFactory.Now.AddHours(-1));
        var visible = await factory.AddEventAsync("Visible Run", Soon.AddHours(1));
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "tyler.browse.hidden@example.org");

        var page = await BrowseEvents.PageAsync(client, cookie);

        var ids = page.GetProperty("events").EnumerateArray().Select(e => e.GetProperty("id").GetString()).ToList();
        Assert.Contains(visible.ToString(), ids);
        Assert.DoesNotContain(draft.ToString(), ids);
        Assert.DoesNotContain(started.ToString(), ids);
    }

    [Fact]
    public async Task Given_events_at_the_edge_of_now_When_a_member_lists_events_Then_one_that_starts_now_is_left_out_and_one_a_second_later_is_in()
    {
        var atNow = await factory.AddEventAsync("Starting Now", BrowseEventsFactory.Now);
        var next = await factory.AddEventAsync("A Second Later", BrowseEventsFactory.Now.AddSeconds(1));
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "tyler.browse.edge@example.org");

        var page = await BrowseEvents.PageAsync(client, cookie);

        var ids = page.GetProperty("events").EnumerateArray().Select(e => e.GetProperty("id").GetString()).ToList();
        Assert.DoesNotContain(atNow.ToString(), ids);
        Assert.Contains(next.ToString(), ids);
    }

    [Theory]
    [InlineData("not-a-cursor")]
    [InlineData("!!!")]
    [InlineData("AAAA")]
    [InlineData("MjAyNi0wNC0xNXxub3QtYS1ndWlk")]
    public async Task Given_a_malformed_cursor_When_events_are_asked_for_Then_it_is_refused_with_cursor_invalid(string cursor)
    {
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, $"grace.cursor.{Math.Abs(cursor.GetHashCode(StringComparison.Ordinal))}@example.org");

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{BrowseEvents.Path}?cursor={Uri.EscapeDataString(cursor)}", cookie);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal("cursor_invalid", problem.GetProperty("fieldCodes").GetProperty("cursor").GetString());
    }
}

/// <summary>L2-009 AC5 (ADR 0027): 45 events come in pages of 20, 20 and 5, in order, none twice. Its own store.</summary>
public sealed class BrowseEventsPagingTests(BrowseEventsFactory factory) : IClassFixture<BrowseEventsFactory>
{
    [Fact]
    public async Task Given_45_events_When_a_member_pages_through_them_Then_pages_hold_20_20_and_5_in_order_with_none_twice()
    {
        var ids = new List<Guid>();
        for (var i = 0; i < 45; i++)
        {
            ids.Add(await factory.AddEventAsync($"Event {i:00}", BrowseEventsFactory.Now.AddDays(1).AddMinutes(i)));
        }

        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.paging@example.org");

        var pages = await BrowseEvents.AllPagesAsync(client, cookie);

        Assert.Equal([20, 20, 5], pages.Select(p => p.Count));
        Assert.Equal(ids.Select(id => id.ToString()), pages.SelectMany(p => p));
    }
}

/// <summary>L2-009 AC5 (ADR 0027): a page of exactly 20 with nothing after it has no next cursor. Its own store.</summary>
public sealed class BrowseEventsExactPageTests(BrowseEventsFactory factory) : IClassFixture<BrowseEventsFactory>
{
    [Fact]
    public async Task Given_exactly_20_events_When_a_member_asks_Then_the_only_page_has_no_next_cursor_and_21_have_one()
    {
        for (var i = 0; i < 20; i++)
        {
            await factory.AddEventAsync($"Exact {i:00}", BrowseEventsFactory.Now.AddDays(2).AddMinutes(i));
        }

        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.paging.exact@example.org");
        var exact = await BrowseEvents.PageAsync(client, cookie);
        await factory.AddEventAsync("Exact 20", BrowseEventsFactory.Now.AddDays(2).AddMinutes(20));
        var over = await BrowseEvents.PageAsync(client, cookie);

        Assert.Equal((20, JsonValueKind.Null), (exact.GetProperty("events").GetArrayLength(), exact.GetProperty("nextCursor").ValueKind));
        Assert.Equal((20, JsonValueKind.String), (over.GetProperty("events").GetArrayLength(), over.GetProperty("nextCursor").ValueKind));
    }
}

/// <summary>L2-009 AC5 (ADR 0027): events with the same start are split across pages by id, none lost or repeated. Its own store.</summary>
public sealed class BrowseEventsTiesTests(BrowseEventsFactory factory) : IClassFixture<BrowseEventsFactory>
{
    [Fact]
    public async Task Given_21_events_with_the_same_start_When_a_member_pages_Then_each_is_listed_once_across_the_pages()
    {
        var start = BrowseEventsFactory.Now.AddDays(30);
        var added = new List<string>();
        for (var i = 0; i < 21; i++)
        {
            added.Add((await factory.AddEventAsync($"Same Start {i:00}", start)).ToString());
        }

        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.paging.ties@example.org");

        var pages = await BrowseEvents.AllPagesAsync(client, cookie);

        Assert.Equal([20, 1], pages.Select(p => p.Count));
        Assert.Equal(added.Order(StringComparer.Ordinal), pages.SelectMany(p => p).Order(StringComparer.Ordinal));
    }
}
