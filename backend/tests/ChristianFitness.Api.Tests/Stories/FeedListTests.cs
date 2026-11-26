using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-060 AC4 (journey 27; ADR 0110): Subscribe lists the six feeds, All stories first, each with
/// its address and about how many stories it carried a week over the last 28 days: a story
/// counts in its section's feed and in All stories, Pros in All stories only, and a story older
/// than 28 days, a draft, an unpublished one or one scheduled for later does not count. This class
/// has its own store, so every story in it is one of these.
/// </summary>
public sealed class FeedListTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    [Fact]
    public async Task Given_stories_over_the_last_28_days_When_the_feeds_are_listed_Then_each_feed_has_its_address_and_stories_a_week()
    {
        var now = factory.Time.GetUtcNow();
        var inside = now - TimeSpan.FromDays(28) + TimeSpan.FromMinutes(1);
        // 9 Events stories in the window: 2.25 a week, shown as 2.
        for (var n = 0; n < 9; n++)
        {
            await factory.PutStoryAsync($"Events {n}", StoryStatus.Published, inside.AddDays(n), section: StorySection.Events, slug: $"feed-list-events-{n}");
        }

        // 5 Nutrition stories: 1.25 a week, shown as 1; one exactly 28 days old does not count.
        for (var n = 0; n < 5; n++)
        {
            await factory.PutStoryAsync($"Nutrition {n}", StoryStatus.Published, now.AddDays(-n - 1), section: StorySection.Nutrition, slug: $"feed-list-nutrition-{n}");
        }

        // The factory publishes a minute after the time it is given.
        await factory.PutStoryAsync("Nutrition, too old", StoryStatus.Published, now - TimeSpan.FromDays(28) - TimeSpan.FromMinutes(1), section: StorySection.Nutrition, slug: "feed-list-nutrition-old");
        // A Pros story counts in All stories only.
        await factory.PutStoryAsync("Pros", StoryStatus.Published, now.AddDays(-2), section: StorySection.Pros, slug: "feed-list-pros");
        // One Training story readers see (0.25 a week, shown as 0); those they do not see count
        // nowhere, so any one of them would make it 0.5, shown as 1.
        await factory.PutStoryAsync("Training", StoryStatus.Published, now.AddDays(-1), section: StorySection.Training, slug: "feed-list-training");
        await factory.PutStoryAsync("Training draft", StoryStatus.Draft, now.AddDays(-1), section: StorySection.Training, slug: "feed-list-draft");
        await factory.PutStoryAsync("Training gone", StoryStatus.Published, now.AddDays(-1), section: StorySection.Training, unpublished: true, slug: "feed-list-gone");
        await factory.PutStoryAsync("Training later", StoryStatus.Scheduled, now.AddDays(-1), section: StorySection.Training, slug: "feed-list-later", publishAt: now.AddDays(1));
        // A scheduled story whose time has come counts, at its time: Community has 2, 0.5 a week,
        // shown as 1 (halves up).
        await factory.PutStoryAsync("Community", StoryStatus.Published, now.AddDays(-4), section: StorySection.Community, slug: "feed-list-community");
        await factory.PutStoryAsync("Community due", StoryStatus.Scheduled, now.AddDays(-3), section: StorySection.Community, slug: "feed-list-due", publishAt: now.AddHours(-1));
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(new Uri("/api/public/feeds", UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var feeds = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        var root = ApiFactory.MemberAppBaseUrl;
        // All stories: 9 + 1 + 5 + 2 + 1 Pros = 18, 4.5 a week, shown as 5; without Pros, 4.
        Assert.Equal(
            [
                ("All stories", $"{root}/feed", 5, true),
                ("Events", $"{root}/events/feed", 2, false),
                ("Training", $"{root}/training/feed", 0, false),
                ("Nutrition", $"{root}/nutrition/feed", 1, false),
                ("Faith & Body", $"{root}/faith-body/feed", 0, false),
                ("Community", $"{root}/community/feed", 1, false),
            ],
            feeds.EnumerateArray().Select(f => (
                f.GetProperty("name").GetString(),
                f.GetProperty("url").GetString(),
                f.GetProperty("storiesPerWeek").GetInt32(),
                f.GetProperty("isAll").GetBoolean())));
        Assert.Equal(["isAll", "name", "storiesPerWeek", "url"], feeds[0].EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
    }
}
