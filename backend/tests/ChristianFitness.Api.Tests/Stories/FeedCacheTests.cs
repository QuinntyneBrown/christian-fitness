using System.Net;
using System.Net.Http.Headers;
using ChristianFitness.Api.Scheduling;
using ChristianFitness.Domain.News;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-060 AC2 (journey 26; ADR 0072, ADR 0108): a feed answers <c>ETag</c>, <c>Last-Modified</c> and
/// <c>Cache-Control: public, max-age=900</c>, and 304 with no body to a request repeating either
/// validator while nothing changed. The API keeps each rendered feed, so a story put straight in the
/// store is not seen until something evicts it; publishing, editing or unpublishing a story through
/// the API, and the publishing clock publishing a scheduled one, evict the All stories feed and the
/// story's section feeds, and no other. This class has its own store and its own feed cache; each
/// test empties the cache after putting its stories, so a feed an earlier test kept is not read.
/// </summary>
public sealed class FeedCacheTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    private static string ActionOf(Guid id, string action) => $"{AdminStories.Path}/{id}/{action}";

    private async Task<(HttpClient Client, string Cookie)> SignInAsync(string who)
    {
        var client = Browser.CreateClient(factory);
        return (client, await AdminStories.SignInAsync(factory, client, $"dana.feeds.{who}@example.org"));
    }

    [Fact]
    public async Task Given_a_feed_When_it_is_asked_for_again_with_its_ETag_or_Last_Modified_Then_it_answers_304_with_no_body_while_nothing_changed()
    {
        await factory.PutStoryAsync("Conditional training", StoryStatus.Published, factory.Time.GetUtcNow().AddDays(-3), section: StorySection.Training, slug: "conditional-training");
        await StoryFeeds.EvictAllAsync(factory);

        using var first = await StoryFeeds.GetAsync(factory, "/training/feed");
        var etag = first.Headers.ETag!;
        var lastModified = first.Content.Headers.LastModified!.Value;
        // Rendered again, not kept: the API itself compares the validators.
        await StoryFeeds.EvictAllAsync(factory);
        using var byTag = await StoryFeeds.GetAsync(factory, "/training/feed", r => r.Headers.IfNoneMatch.Add(etag));
        using var byDate = await StoryFeeds.GetAsync(factory, "/training/feed", r => r.Headers.IfModifiedSince = lastModified);
        using var otherTag = await StoryFeeds.GetAsync(factory, "/training/feed", r => r.Headers.IfNoneMatch.Add(new EntityTagHeaderValue("\"another\"")));
        // Kept by the 200 just served: the cache compares them.
        using var keptByTag = await StoryFeeds.GetAsync(factory, "/training/feed", r => r.Headers.IfNoneMatch.Add(etag));

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.False(etag.IsWeak);
        Assert.Equal("public, max-age=900", first.Headers.CacheControl!.ToString());
        Assert.Equal((HttpStatusCode.NotModified, etag, string.Empty), (byTag.StatusCode, byTag.Headers.ETag, await byTag.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)));
        Assert.Equal((HttpStatusCode.NotModified, string.Empty), (byDate.StatusCode, await byDate.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)));
        Assert.Equal(HttpStatusCode.OK, otherTag.StatusCode);
        Assert.Contains("Conditional training", await StoryFeeds.TitlesAsync(otherTag));
        Assert.Equal((HttpStatusCode.NotModified, etag), (keptByTag.StatusCode, keptByTag.Headers.ETag));
    }

    [Fact]
    public async Task Given_feeds_already_served_When_an_Admin_publishes_a_story_Then_its_feeds_are_evicted_and_another_section_feed_stays_kept()
    {
        var now = factory.Time.GetUtcNow();
        var byline = await factory.AddBylineAsync("Cache Writer");
        await factory.PutStoryAsync("Kept event story", StoryStatus.Published, now.AddDays(-6), byline, StorySection.Events, slug: "kept-event-story");
        await StoryFeeds.EvictAllAsync(factory);
        using (await StoryFeeds.GetAsync(factory, "/events/feed"))
        using (await StoryFeeds.GetAsync(factory, "/feed"))
        {
        }

        await factory.PutStoryAsync("Put straight in the store", StoryStatus.Published, now.AddDays(-5), byline, StorySection.Events, slug: "put-straight-in");
        using var kept = await StoryFeeds.GetAsync(factory, "/feed");
        Assert.DoesNotContain("Put straight in the store", await StoryFeeds.TitlesAsync(kept));

        var draft = await factory.PutStoryAsync("Draft to publish", bylineId: byline, section: StorySection.Nutrition);
        var (client, cookie) = await SignInAsync("publish");
        using (client)
        {
            var body = WriteStoryTests.Fields(byline, draft.Version);
            body["headline"] = "Published through the console";
            body["section"] = "nutrition";
            using var published = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(draft.Id, "publish"), cookie, body);
            Assert.Equal(HttpStatusCode.OK, published.StatusCode);
        }

        using var all = await StoryFeeds.GetAsync(factory, "/feed");
        using var nutrition = await StoryFeeds.GetAsync(factory, "/nutrition/feed");
        using var events = await StoryFeeds.GetAsync(factory, "/events/feed");
        var allTitles = await StoryFeeds.TitlesAsync(all);
        Assert.Contains("Published through the console", allTitles);
        Assert.Contains("Put straight in the store", allTitles);
        Assert.Contains("Published through the console", await StoryFeeds.TitlesAsync(nutrition));
        Assert.Equal(["Kept event story"], await StoryFeeds.TitlesAsync(events));
    }

    [Fact]
    public async Task Given_a_published_story_in_served_feeds_When_an_Admin_updates_it_into_another_section_Then_both_section_feeds_and_All_stories_show_the_change()
    {
        var byline = await factory.AddBylineAsync("Update Writer");
        var story = await factory.PutStoryAsync("Before the update", StoryStatus.Published, factory.Time.GetUtcNow().AddDays(-4), byline, StorySection.Community, slug: "before-the-update");
        await StoryFeeds.EvictAllAsync(factory);
        using var before = await StoryFeeds.GetAsync(factory, "/feed");
        using (await StoryFeeds.GetAsync(factory, "/community/feed"))
        using (await StoryFeeds.GetAsync(factory, "/nutrition/feed"))
        {
        }

        var (client, cookie) = await SignInAsync("update");
        using (client)
        {
            var body = WriteStoryTests.Fields(byline, story.Version);
            body["headline"] = "After the update";
            body["section"] = "nutrition";
            body["slug"] = "before-the-update";
            using var updated = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "update"), cookie, body);
            Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        }

        using var all = await StoryFeeds.GetAsync(factory, "/feed", r => r.Headers.IfNoneMatch.Add(before.Headers.ETag!));
        using var community = await StoryFeeds.GetAsync(factory, "/community/feed");
        using var nutrition = await StoryFeeds.GetAsync(factory, "/nutrition/feed");
        Assert.Equal(HttpStatusCode.OK, all.StatusCode);
        var allTitles = await StoryFeeds.TitlesAsync(all);
        Assert.Contains("After the update", allTitles);
        Assert.DoesNotContain("Before the update", allTitles);
        Assert.DoesNotContain("Before the update", await StoryFeeds.TitlesAsync(community));
        Assert.DoesNotContain("After the update", await StoryFeeds.TitlesAsync(community));
        Assert.Contains("After the update", await StoryFeeds.TitlesAsync(nutrition));
    }

    [Fact]
    public async Task Given_a_published_story_in_served_feeds_When_an_Admin_unpublishes_it_Then_it_leaves_All_stories_and_its_section_feed()
    {
        var story = await factory.PutStoryAsync("To be unpublished", StoryStatus.Published, factory.Time.GetUtcNow().AddDays(-2), section: StorySection.Training, slug: "to-be-unpublished");
        await StoryFeeds.EvictAllAsync(factory);
        using var before = await StoryFeeds.GetAsync(factory, "/training/feed");
        Assert.Contains("To be unpublished", await StoryFeeds.TitlesAsync(before));
        using (await StoryFeeds.GetAsync(factory, "/feed"))
        {
        }

        var (client, cookie) = await SignInAsync("unpublish");
        factory.Time.Advance(TimeSpan.FromSeconds(5));
        using (client)
        {
            using var unpublished = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "unpublish"), cookie, new { version = story.Version });
            Assert.Equal(HttpStatusCode.OK, unpublished.StatusCode);
        }

        using var all = await StoryFeeds.GetAsync(factory, "/feed");
        using var training = await StoryFeeds.GetAsync(factory, "/training/feed", r => r.Headers.IfNoneMatch.Add(before.Headers.ETag!));
        using var trainingByDate = await StoryFeeds.GetAsync(factory, "/training/feed", r => r.Headers.IfModifiedSince = before.Content.Headers.LastModified);
        Assert.DoesNotContain("To be unpublished", await StoryFeeds.TitlesAsync(all));
        Assert.Equal(HttpStatusCode.OK, trainingByDate.StatusCode);
        Assert.Equal(HttpStatusCode.OK, training.StatusCode);
        Assert.DoesNotContain("To be unpublished", await StoryFeeds.TitlesAsync(training));
    }

    [Fact]
    public async Task Given_a_served_feed_and_a_story_scheduled_in_its_section_When_the_publishing_clock_publishes_it_Then_the_feed_carries_it()
    {
        var now = factory.Time.GetUtcNow();
        await factory.PutStoryAsync("Scheduled for the clock", StoryStatus.Scheduled, now.AddDays(-1), section: StorySection.FaithAndBody, slug: "scheduled-for-the-clock", publishAt: now.AddMinutes(1));
        await StoryFeeds.EvictAllAsync(factory);
        using (await StoryFeeds.GetAsync(factory, "/faith-body/feed"))
        {
        }

        factory.Time.Advance(TimeSpan.FromMinutes(2));
        using var stale = await StoryFeeds.GetAsync(factory, "/faith-body/feed");
        Assert.DoesNotContain("Scheduled for the clock", await StoryFeeds.TitlesAsync(stale));

        var clock = new PublishingClock(factory.Services.GetRequiredService<IServiceScopeFactory>(), factory.Time, NullLogger<PublishingClock>.Instance, "feed-cache-tests");
        var tick = await clock.TickAsync(TestContext.Current.CancellationToken);
        clock.Dispose();

        Assert.True(tick.Published > 0, "The clock published the due story.");
        using var fresh = await StoryFeeds.GetAsync(factory, "/faith-body/feed");
        Assert.Contains("Scheduled for the clock", await StoryFeeds.TitlesAsync(fresh));
    }
}
