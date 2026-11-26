using System.Net;
using System.Text.Json;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>What the front-page tests ask the API: no cookie, as a visitor (L2-001; ADR 0105).</summary>
internal static class FrontPage
{
    public const string Path = "/api/public/stories";

    public static readonly string[] Keys = ["lead", "headlines", "latest", "nextCursor", "mostRead"];

    public static readonly string[] StoryKeys = ["id", "slug", "section", "headline", "summary", "byline", "publishedAt", "imageKey"];

    public static async Task<JsonElement> ReadAsync(StoriesFactory factory, string query = "")
    {
        using var client = Browser.CreateClient(factory);
        using var response = await Browser.SendAsync(client, HttpMethod.Get, Path + query, cookie: null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await AdminStories.JsonAsync(response);
    }

    /// <summary>The lead story's headline, or none.</summary>
    public static string? LeadOf(JsonElement page) =>
        page.GetProperty("lead").ValueKind == JsonValueKind.Null ? null : page.GetProperty("lead").GetProperty("headline").GetString();

    /// <summary>The headlines of the stories in <paramref name="part"/> (<c>headlines</c>, <c>latest</c>, <c>mostRead</c>), in order.</summary>
    public static string[] Of(JsonElement page, string part) =>
        [.. page.GetProperty(part).EnumerateArray().Select(s => s.GetProperty("headline").GetString()!)];

    public static string? CursorOf(JsonElement page) => page.GetProperty("nextCursor").GetString();
}

/// <summary>
/// L2-001 AC2, AC4, AC10 and L2-069 AC5, AC6 (journey 25; ADR 0105): a visitor reads the front page
/// with no session. Only stories readers may see are answered: Published ones and Scheduled ones
/// whose time has come, at that time (ADR 0069). With nothing placed, the newest leads, the next
/// four are the headlines and the rest are the river, newest first. A story placed Lead leads
/// whatever its age, stories placed Top take the headlines before newer ones, and no story appears
/// twice. A story answers only what its page publishes.
/// </summary>
public sealed class FrontPageTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    private DateTimeOffset Ago(int minutes) => factory.Time.GetUtcNow().AddMinutes(-minutes);

    /// <summary>A Published story that went out <paramref name="minutesAgo"/> minutes ago.</summary>
    private Task<Story> PublishedAsync(string headline, int minutesAgo, StoryPlacement placement = StoryPlacement.Latest, StorySection section = StorySection.Community) =>
        factory.PutStoryAsync(headline, StoryStatus.Published, Ago(minutesAgo + 1), section: section, placement: placement, slug: headline.ToLowerInvariant().Replace(' ', '-'));

    [Fact]
    public async Task Given_stories_of_every_status_and_nothing_placed_When_a_visitor_reads_the_front_page_Then_the_newest_leads_the_next_four_are_headlines_and_the_rest_follow_newest_first()
    {
        await factory.ClearStoriesAsync();
        for (var n = 8; n >= 1; n--)
        {
            await PublishedAsync($"Story {n}", minutesAgo: n * 10);
        }

        await factory.PutStoryAsync("A draft", at: Ago(5));
        await factory.PutStoryAsync("In review", StoryStatus.InReview, Ago(5));
        await factory.PutStoryAsync("Unpublished", StoryStatus.Published, Ago(5), unpublished: true);
        await factory.PutStoryAsync("Scheduled for later", StoryStatus.Scheduled, Ago(500), publishAt: Ago(-1));
        await factory.PutStoryAsync("Past due", StoryStatus.Scheduled, Ago(500), publishAt: Ago(25), slug: "past-due");

        var page = await FrontPage.ReadAsync(factory);

        Assert.Equal(FrontPage.Keys, AdminStories.Keys(page));
        Assert.Equal("Story 1", FrontPage.LeadOf(page));
        Assert.Equal(["Story 2", "Past due", "Story 3", "Story 4"], FrontPage.Of(page, "headlines"));
        Assert.Equal(["Story 5", "Story 6", "Story 7", "Story 8"], FrontPage.Of(page, "latest"));
        Assert.Null(FrontPage.CursorOf(page));
        Assert.Empty(FrontPage.Of(page, "mostRead"));
        var pastDue = page.GetProperty("headlines")[1];
        Assert.Equal(Ago(25), pastDue.GetProperty("publishedAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task Given_a_story_with_everything_and_one_with_little_When_the_front_page_is_read_Then_each_answers_only_its_public_fields()
    {
        await factory.ClearStoriesAsync();
        var byline = await factory.AddBylineAsync("Naomi Okafor");
        var bare = await factory.PutStoryAsync("Bare story", StoryStatus.Published, Ago(61), byline, StorySection.Pros, slug: "bare-story", summary: "  ");
        var full = await factory.PutStoryAsync(
            "Full story", StoryStatus.Published, Ago(31), byline, StorySection.FaithAndBody, slug: "full-story", summary: "Why rest is training.", imageKey: "story-full.webp");

        var page = await FrontPage.ReadAsync(factory);

        var lead = page.GetProperty("lead");
        Assert.Equal(FrontPage.StoryKeys, AdminStories.Keys(lead));
        Assert.Equal(
            (full.Id, "full-story", "faith-body", "Full story", "Why rest is training.", "Naomi Okafor", Ago(30), "story-full.webp"),
            (lead.GetProperty("id").GetGuid(), lead.GetProperty("slug").GetString(), lead.GetProperty("section").GetString(), lead.GetProperty("headline").GetString(),
                lead.GetProperty("summary").GetString(), lead.GetProperty("byline").GetString(), lead.GetProperty("publishedAt").GetDateTimeOffset(), lead.GetProperty("imageKey").GetString()));
        var second = page.GetProperty("headlines")[0];
        Assert.Equal(FrontPage.StoryKeys, AdminStories.Keys(second));
        Assert.Equal(
            (bare.Id, "pros", JsonValueKind.Null, JsonValueKind.Null),
            (second.GetProperty("id").GetGuid(), second.GetProperty("section").GetString(), second.GetProperty("summary").ValueKind, second.GetProperty("imageKey").ValueKind));
    }

    [Fact]
    public async Task Given_stories_placed_Lead_and_Top_When_the_front_page_is_read_Then_the_Lead_leads_the_Top_stories_take_the_headlines_and_no_story_appears_twice()
    {
        await factory.ClearStoriesAsync();
        await PublishedAsync("Newest", minutesAgo: 10);
        await PublishedAsync("Newer", minutesAgo: 20);
        await PublishedAsync("Top recent", minutesAgo: 30, StoryPlacement.Top);
        await PublishedAsync("Ordinary", minutesAgo: 40);
        await PublishedAsync("The lead", minutesAgo: 50, StoryPlacement.Lead);
        await PublishedAsync("Top old", minutesAgo: 60, StoryPlacement.Top);
        await PublishedAsync("Oldest", minutesAgo: 70);

        var page = await FrontPage.ReadAsync(factory);

        Assert.Equal("The lead", FrontPage.LeadOf(page));
        Assert.Equal(["Newest", "Newer", "Top recent", "Top old"], FrontPage.Of(page, "headlines"));
        Assert.Equal(["Ordinary", "Oldest"], FrontPage.Of(page, "latest"));
    }

    [Fact]
    public async Task Given_no_story_a_reader_may_see_When_the_front_page_is_read_Then_it_has_no_lead_and_every_list_is_empty()
    {
        await factory.ClearStoriesAsync();
        await factory.PutStoryAsync("Only a draft");

        var page = await FrontPage.ReadAsync(factory);

        Assert.Equal(JsonValueKind.Null, page.GetProperty("lead").ValueKind);
        Assert.Equal((0, 0, 0), (page.GetProperty("headlines").GetArrayLength(), page.GetProperty("latest").GetArrayLength(), page.GetProperty("mostRead").GetArrayLength()));
        Assert.Null(FrontPage.CursorOf(page));
    }
}
