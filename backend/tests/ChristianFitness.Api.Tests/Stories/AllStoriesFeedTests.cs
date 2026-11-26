using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-060 AC1, AC6, AC7 (journey 26; ADR 0072, ADR 0108): anyone asks for <c>/feed</c> and gets RSS
/// 2.0 of the stories readers see, newest first, Pros included, with title, link, summary, section,
/// author, publication date and a permanent id; never a draft, an unpublished story or one still
/// waiting for its time; no cookie. This class has its own store, so every story in it is one of these.
/// </summary>
public sealed class AllStoriesFeedTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    [Fact]
    public async Task Given_stories_in_every_state_When_anyone_asks_for_the_feed_Then_it_answers_RSS_of_the_published_ones_newest_first_and_sets_no_cookie()
    {
        var now = factory.Time.GetUtcNow();
        var byline = await factory.AddBylineAsync("Naomi Feed");
        var community = await factory.PutStoryAsync(
            "Rowers & <kettlebells> in a basement",
            StoryStatus.Published,
            now.AddDays(-5),
            byline,
            StorySection.Community,
            slug: "rowers-in-a-basement",
            content: c => c with { Summary = "Strong & steady <b>together</b>." });
        var pros = await factory.PutStoryAsync("A physio on sore knees", StoryStatus.Published, now.AddDays(-2), byline, StorySection.Pros, slug: "physio-sore-knees");
        var due = await factory.PutStoryAsync(
            "Couch to 5K starts Saturday",
            StoryStatus.Scheduled,
            now.AddDays(-4),
            byline,
            StorySection.Training,
            slug: "couch-to-5k-saturday",
            publishAt: now.AddHours(-1));
        await factory.PutStoryAsync("A draft about rest", StoryStatus.Draft, now.AddDays(-1), byline, StorySection.Training, slug: "draft-about-rest");
        await factory.PutStoryAsync("An unpublished story", StoryStatus.Published, now.AddDays(-1), byline, StorySection.Community, unpublished: true, slug: "unpublished-story");
        await factory.PutStoryAsync("Waiting for Friday", StoryStatus.Scheduled, now.AddDays(-1), byline, StorySection.Events, slug: "waiting-for-friday", publishAt: now.AddDays(1));

        using var response = await StoryFeeds.GetAsync(factory, "/feed");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/rss+xml; charset=utf-8", response.Content.Headers.ContentType!.ToString());
        Assert.False(response.Headers.Contains("Set-Cookie"));
        var rss = (await StoryFeeds.DocumentAsync(response)).Root!;
        Assert.Equal(("rss", "2.0"), (rss.Name.LocalName, rss.Attribute("version")!.Value));
        var channel = rss.Element("channel")!;
        Assert.Equal(
            ("Christian Fitness: All stories", $"{ApiFactory.MemberAppBaseUrl}/", $"{ApiFactory.MemberAppBaseUrl}/feed", "en-ca"),
            (channel.Element("title")!.Value, channel.Element("link")!.Value, channel.Element(StoryFeeds.Atom + "link")!.Attribute("href")!.Value, channel.Element("language")!.Value));
        var items = channel.Elements("item").ToList();
        Assert.Equal(["Couch to 5K starts Saturday", "A physio on sore knees", "Rowers & <kettlebells> in a basement"], items.Select(i => i.Element("title")!.Value));
        Assert.All(items, i => Assert.Equal(["title", "link", "description", "category", "creator", "pubDate", "guid"], i.Elements().Select(e => e.Name.LocalName)));
        var first = items[0];
        Assert.Equal(
            ($"{ApiFactory.MemberAppBaseUrl}/stories/couch-to-5k-saturday", "Training", "Naomi Feed", now.AddHours(-1).ToString("r", CultureInfo.InvariantCulture), $"urn:uuid:{due.Id}", "false"),
            (first.Element("link")!.Value, first.Element("category")!.Value, first.Element(StoryFeeds.Dc + "creator")!.Value, first.Element("pubDate")!.Value, first.Element("guid")!.Value, first.Element("guid")!.Attribute("isPermaLink")!.Value));
        Assert.Equal(("Pros", $"urn:uuid:{pros.Id}"), (items[1].Element("category")!.Value, items[1].Element("guid")!.Value));
        var escaped = items[2];
        Assert.Equal(
            ("Strong & steady <b>together</b>.", "Community", community.FirstPublishedAt!.Value.ToString("r", CultureInfo.InvariantCulture)),
            (escaped.Element("description")!.Value, escaped.Element("category")!.Value, escaped.Element("pubDate")!.Value));
    }

    [Fact]
    public async Task Given_120_feed_reads_from_one_address_When_it_reads_again_Then_public_reads_refuses_it_with_too_many_requests()
    {
        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i < 120; i++)
        {
            using var read = await StoryFeeds.GetAsync(factory, i % 2 == 0 ? "/feed" : "/community/feed", clientAddress: "203.0.113.126");
            statuses.Add(read.StatusCode);
        }

        using var refused = await StoryFeeds.GetAsync(factory, "/feed", clientAddress: "203.0.113.126");

        Assert.All(statuses, status => Assert.Equal(HttpStatusCode.OK, status));
        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        var problem = await refused.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("too_many_requests", problem.GetProperty("code").GetString());
    }
}
