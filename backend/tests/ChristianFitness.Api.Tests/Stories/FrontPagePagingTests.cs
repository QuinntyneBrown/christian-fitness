using System.Globalization;
using System.Net;
using System.Text.Json;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-001 AC2 and L2-037 (journey 25; ADR 0105): the river is answered 12 stories at a time with the
/// opaque cursor of the next page, which answers the next 12 alone, with no lead, headlines or most
/// read. Paging never repeats or skips a story, even when the top stories change between pages, and
/// stops at 60 stories. A cursor this API did not write is refused with 400 <c>validation_failed</c>.
/// </summary>
public sealed class FrontPagePagingTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    private static string Name(int n) => $"River {n.ToString("D2", CultureInfo.InvariantCulture)}";

    private DateTimeOffset Ago(int minutes) => factory.Time.GetUtcNow().AddMinutes(-minutes);

    private Task<Story> PublishedAsync(string headline, int minutesAgo, StoryPlacement placement = StoryPlacement.Latest, StorySection section = StorySection.Community) =>
        factory.PutStoryAsync(headline, StoryStatus.Published, Ago(minutesAgo + 1), section: section, placement: placement, slug: headline.ToLowerInvariant().Replace(' ', '-'));

    /// <summary>A lead placed long ago, four headlines placed Top, and <paramref name="river"/> newer stories, River 01 the newest.</summary>
    private async Task PutTopAndRiverAsync(int river)
    {
        await factory.ClearStoriesAsync();
        await PublishedAsync("Old lead", 5000, StoryPlacement.Lead);
        for (var n = 1; n <= 4; n++)
        {
            await PublishedAsync($"Top {n}", 4000 + n, StoryPlacement.Top);
        }

        for (var n = river; n >= 1; n--)
        {
            await PublishedAsync(Name(n), n * 10);
        }
    }

    private Task<JsonElement> NextAsync(JsonElement page, string section = "") =>
        FrontPage.ReadAsync(factory, $"?cursor={Uri.EscapeDataString(FrontPage.CursorOf(page)!)}{section}");

    [Fact]
    public async Task Given_30_stories_under_the_top_When_the_river_is_read_page_by_page_Then_each_page_holds_the_next_12_alone_and_the_last_has_no_cursor()
    {
        await PutTopAndRiverAsync(30);

        var first = await FrontPage.ReadAsync(factory);
        var second = await NextAsync(first);
        var third = await NextAsync(second);

        Assert.Equal("Old lead", FrontPage.LeadOf(first));
        Assert.Equal(["Top 1", "Top 2", "Top 3", "Top 4"], FrontPage.Of(first, "headlines"));
        Assert.Equal(Enumerable.Range(1, 12).Select(Name), FrontPage.Of(first, "latest"));
        Assert.Equal(Enumerable.Range(13, 12).Select(Name), FrontPage.Of(second, "latest"));
        Assert.Equal(Enumerable.Range(25, 6).Select(Name), FrontPage.Of(third, "latest"));
        Assert.Null(FrontPage.CursorOf(third));
        foreach (var later in new[] { second, third })
        {
            Assert.Equal(FrontPage.Keys, AdminStories.Keys(later));
            Assert.Null(FrontPage.LeadOf(later));
            Assert.Equal((0, 0), (later.GetProperty("headlines").GetArrayLength(), later.GetProperty("mostRead").GetArrayLength()));
        }
    }

    [Fact]
    public async Task Given_exactly_12_stories_under_the_top_When_the_front_page_is_read_Then_there_is_no_next_page()
    {
        await PutTopAndRiverAsync(12);

        var page = await FrontPage.ReadAsync(factory);

        Assert.Equal(12, page.GetProperty("latest").GetArrayLength());
        Assert.Null(FrontPage.CursorOf(page));
    }

    [Fact]
    public async Task Given_a_new_Lead_goes_out_between_pages_When_the_next_page_is_read_Then_no_story_is_repeated_or_skipped()
    {
        await PutTopAndRiverAsync(20);
        var first = await FrontPage.ReadAsync(factory);
        // The new Lead takes the front page, and the lead the reader has seen becomes an ordinary
        // story older than every story of the river (L2-069 AC6).
        await factory.ClearLeadsAsync();
        await PublishedAsync("New lead", 1, StoryPlacement.Lead);

        var second = await NextAsync(first);

        Assert.Equal(Enumerable.Range(13, 8).Select(Name), FrontPage.Of(second, "latest"));
        Assert.Null(FrontPage.CursorOf(second));
        Assert.Equal("New lead", FrontPage.LeadOf(await FrontPage.ReadAsync(factory)));
    }

    [Fact]
    public async Task Given_70_stories_under_the_top_When_the_river_is_read_to_its_end_Then_it_stops_at_60_stories()
    {
        await PutTopAndRiverAsync(70);

        var page = await FrontPage.ReadAsync(factory);
        var read = FrontPage.Of(page, "latest").ToList();
        var pages = 1;
        while (FrontPage.CursorOf(page) is not null)
        {
            page = await NextAsync(page);
            read.AddRange(FrontPage.Of(page, "latest"));
            pages++;
            Assert.True(pages <= 5, "The river went on after its fifth page.");
        }

        Assert.Equal(5, pages);
        Assert.Equal(Enumerable.Range(1, 60).Select(Name), read);
    }

    [Fact]
    public async Task Given_14_stories_in_a_section_When_it_is_read_page_by_page_Then_the_cursor_continues_in_that_section()
    {
        await factory.ClearStoriesAsync();
        for (var n = 14; n >= 1; n--)
        {
            await PublishedAsync(Name(n), n * 10, section: StorySection.Training);
            await PublishedAsync($"Other {n}", (n * 10) + 5, section: StorySection.Events);
        }

        var first = await FrontPage.ReadAsync(factory, "?section=training");
        var second = await NextAsync(first, "&section=training");

        Assert.Equal(Enumerable.Range(1, 12).Select(Name), FrontPage.Of(first, "latest"));
        Assert.Equal(Enumerable.Range(13, 2).Select(Name), FrontPage.Of(second, "latest"));
        Assert.Null(FrontPage.CursorOf(second));
    }

    [Theory]
    [InlineData("not-a-cursor")]
    [InlineData("MTIzfGFiYw")]
    public async Task Given_a_cursor_the_API_did_not_write_When_the_river_is_read_Then_it_is_refused_with_validation_failed_naming_the_cursor(string cursor)
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{FrontPage.Path}?cursor={cursor}", cookie: null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await AdminStories.JsonAsync(response);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal(["cursor"], AdminStories.Keys(problem.GetProperty("errors")));
        Assert.Equal("cursor_invalid", problem.GetProperty("fieldCodes").GetProperty("cursor").GetString());
    }
}
