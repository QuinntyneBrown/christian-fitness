using System.Net;
using System.Text.Json;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>What the front-page tests ask the API: no cookie, as a visitor.</summary>
internal static class FrontPage
{
    public const string Path = "/api/public/stories";

    public static async Task<HttpResponseMessage> AskAsync(HttpClient client, string query = "") =>
        await Browser.SendAsync(client, HttpMethod.Get, $"{Path}{query}", null);

    public static async Task<JsonElement> ReadAsync(HttpClient client, string query = "")
    {
        using var response = await AskAsync(client, query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await AdminStories.JsonAsync(response);
    }

    public static string[] Headlines(JsonElement list) => [.. list.EnumerateArray().Select(s => s.GetProperty("headline").GetString()!)];
}

/// <summary>
/// L2-001 AC2, AC10 (journey 25; ADR 0107): Latest answers the newest readable story as the lead,
/// the next four as headlines and the rest as the river, newest first, each with what the page
/// shows and nothing of a member. Drafts, stories in review, scheduled ones not yet due and
/// unpublished ones never appear; a Scheduled story whose time has come does.
/// </summary>
public sealed class FrontPageLatestTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    [Fact]
    public async Task Given_readable_stories_When_Latest_is_asked_for_Then_the_newest_leads_the_next_four_are_headlines_and_the_rest_follow_newest_first()
    {
        var at = factory.Time.GetUtcNow().AddDays(-3);
        var byline = await factory.AddBylineAsync("Front Writer");
        for (var n = 1; n <= 7; n++)
        {
            await factory.PutStoryAsync($"Story {n}", StoryStatus.Published, at.AddHours(n), byline, StorySection.Training, slug: $"front-story-{n}");
        }

        await factory.PutStoryAsync(
            "Story 8",
            StoryStatus.Published,
            at.AddHours(8),
            byline,
            StorySection.Community,
            slug: "front-story-8",
            content: c => c with { Summary = "The newest one.", ImageKey = "0193a9c00000700080000000000000b8.jpg", ImageCrop = new StoryCrop(0, 0, 1600, 900) });
        await factory.PutStoryAsync("Due scheduled", StoryStatus.Scheduled, at.AddHours(1), byline, StorySection.Pros, slug: "front-due", publishAt: at.AddHours(5).AddMinutes(30));
        await factory.PutStoryAsync("A draft", StoryStatus.Draft, at.AddHours(9), byline, slug: "front-draft");
        await factory.PutStoryAsync("In review", StoryStatus.InReview, at.AddHours(9), byline, slug: "front-review");
        await factory.PutStoryAsync("Not yet", StoryStatus.Scheduled, at.AddHours(9), byline, slug: "front-not-yet", publishAt: factory.Time.GetUtcNow().AddDays(1));
        await factory.PutStoryAsync("Unpublished", StoryStatus.Published, at.AddHours(9), byline, unpublished: true, slug: "front-unpublished");
        using var client = Browser.CreateClient(factory);

        var page = await FrontPage.ReadAsync(client);

        Assert.Equal(["lead", "headlines", "latest", "more"], AdminStories.Keys(page));
        var lead = page.GetProperty("lead");
        Assert.Equal(["id", "slug", "section", "headline", "summary", "author", "publishedAt", "image"], AdminStories.Keys(lead));
        Assert.Equal(
            ("front-story-8", "community", "Story 8", "The newest one.", "Front Writer", at.AddHours(8).AddMinutes(1), "0193a9c00000700080000000000000b8.jpg"),
            (lead.GetProperty("slug").GetString(), lead.GetProperty("section").GetString(), lead.GetProperty("headline").GetString(),
             lead.GetProperty("summary").GetString(), lead.GetProperty("author").GetString(), lead.GetProperty("publishedAt").GetDateTimeOffset(),
             lead.GetProperty("image").GetProperty("key").GetString()));
        Assert.Equal(["Story 7", "Story 6", "Due scheduled", "Story 5"], FrontPage.Headlines(page.GetProperty("headlines")));
        Assert.Equal(["Story 4", "Story 3", "Story 2", "Story 1"], FrontPage.Headlines(page.GetProperty("latest")));
        var river = page.GetProperty("latest").EnumerateArray().First();
        Assert.Equal((JsonValueKind.Null, JsonValueKind.Null), (river.GetProperty("summary").ValueKind, river.GetProperty("image").ValueKind));
        Assert.False(page.GetProperty("more").GetBoolean());
    }
}

/// <summary>
/// L2-069 AC6 with L2-001 AC2 (ADR 0107): a story placed as the Lead leads even when newer ones
/// follow it, and stories placed in Top headlines come before newer ones placed in The latest.
/// </summary>
public sealed class FrontPagePlacementTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    [Fact]
    public async Task Given_a_Lead_and_a_Top_story_When_Latest_is_asked_for_Then_the_Lead_leads_and_the_Top_story_is_a_headline()
    {
        var at = factory.Time.GetUtcNow().AddDays(-3);
        var byline = await factory.AddBylineAsync("Placed Writer");
        await factory.PutStoryAsync("Placed lead", StoryStatus.Published, at, byline, placement: StoryPlacement.Lead, slug: "placed-lead");
        await factory.PutStoryAsync("Placed top", StoryStatus.Published, at.AddHours(1), byline, placement: StoryPlacement.Top, slug: "placed-top");
        for (var n = 1; n <= 5; n++)
        {
            await factory.PutStoryAsync($"Later {n}", StoryStatus.Published, at.AddHours(1 + n), byline, slug: $"placed-later-{n}");
        }

        using var client = Browser.CreateClient(factory);

        var page = await FrontPage.ReadAsync(client);

        Assert.Equal("Placed lead", page.GetProperty("lead").GetProperty("headline").GetString());
        Assert.Equal(["Later 5", "Later 4", "Later 3", "Placed top"], FrontPage.Headlines(page.GetProperty("headlines")));
        Assert.Equal(["Later 2", "Later 1"], FrontPage.Headlines(page.GetProperty("latest")));
    }
}

/// <summary>
/// L2-001 AC3, AC4 (ADR 0107): a section answers only its own stories, newest first, as the river,
/// with no lead and no headlines; a section with none answers an empty river; an unknown section is
/// refused, since the page shows Latest for it and never sends one.
/// </summary>
public sealed class FrontPageSectionTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    [Fact]
    public async Task Given_stories_in_several_sections_When_one_section_is_asked_for_Then_only_its_stories_come_newest_first_without_top_stories()
    {
        var at = factory.Time.GetUtcNow().AddDays(-3);
        var byline = await factory.AddBylineAsync("Section Writer");
        await factory.PutStoryAsync("Older faith", StoryStatus.Published, at, byline, StorySection.FaithAndBody, placement: StoryPlacement.Lead, slug: "older-faith");
        await factory.PutStoryAsync("Nutrition", StoryStatus.Published, at.AddHours(1), byline, StorySection.Nutrition, slug: "section-nutrition");
        await factory.PutStoryAsync("Newer faith", StoryStatus.Published, at.AddHours(2), byline, StorySection.FaithAndBody, slug: "newer-faith");
        using var client = Browser.CreateClient(factory);

        var page = await FrontPage.ReadAsync(client, "?section=faith-and-body");
        var empty = await FrontPage.ReadAsync(client, "?section=training");

        Assert.Equal(JsonValueKind.Null, page.GetProperty("lead").ValueKind);
        Assert.Equal(0, page.GetProperty("headlines").GetArrayLength());
        Assert.Equal(["Newer faith", "Older faith"], FrontPage.Headlines(page.GetProperty("latest")));
        Assert.Equal(0, empty.GetProperty("latest").GetArrayLength());
    }

    [Theory]
    [InlineData("?section=faith-body", "section", "section_invalid")]
    [InlineData("?section=Events", "section", "section_invalid")]
    [InlineData("?skip=-1", "skip", "skip_invalid")]
    [InlineData("?skip=60", "skip", "skip_invalid")]
    public async Task Given_an_unknown_section_or_a_skip_out_of_range_When_asked_for_Then_it_is_refused(string query, string field, string code)
    {
        using var client = Browser.CreateClient(factory);

        using var response = await FrontPage.AskAsync(client, query);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await AdminStories.JsonAsync(response);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal([field], AdminStories.Keys(problem.GetProperty("fieldCodes")));
        Assert.Equal(code, problem.GetProperty("fieldCodes").GetProperty(field).GetString());
    }
}

/// <summary>
/// L2-001 AC2 with AGENTS.md's "bound what grows" (ADR 0107): the river comes 12 stories at a time
/// after the top stories, <c>more</c> says whether older ones follow, and the page asks for at most
/// 60 (a skip of 48 at most).
/// </summary>
public sealed class FrontPageMoreTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    [Fact]
    public async Task Given_thirty_two_stories_When_the_river_is_asked_for_twelve_at_a_time_Then_each_page_follows_the_last_and_the_third_is_the_end()
    {
        var at = factory.Time.GetUtcNow().AddDays(-3);
        var byline = await factory.AddBylineAsync("Paging Writer");
        for (var n = 1; n <= 32; n++)
        {
            await factory.PutStoryAsync($"Paged {n}", StoryStatus.Published, at.AddHours(n), byline, slug: $"paged-{n}");
        }

        using var client = Browser.CreateClient(factory);

        var first = await FrontPage.ReadAsync(client);
        var second = await FrontPage.ReadAsync(client, "?skip=12");
        var third = await FrontPage.ReadAsync(client, "?skip=24");

        Assert.Equal([.. Enumerable.Range(16, 12).Reverse().Select(n => $"Paged {n}")], FrontPage.Headlines(first.GetProperty("latest")));
        Assert.True(first.GetProperty("more").GetBoolean());
        Assert.Equal([.. Enumerable.Range(4, 12).Reverse().Select(n => $"Paged {n}")], FrontPage.Headlines(second.GetProperty("latest")));
        Assert.True(second.GetProperty("more").GetBoolean());
        Assert.Equal(["Paged 3", "Paged 2", "Paged 1"], FrontPage.Headlines(third.GetProperty("latest")));
        Assert.False(third.GetProperty("more").GetBoolean());
        Assert.Equal("Paged 32", third.GetProperty("lead").GetProperty("headline").GetString());
    }
}
