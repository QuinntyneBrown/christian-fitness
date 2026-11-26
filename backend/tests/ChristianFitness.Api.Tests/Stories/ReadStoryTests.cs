using System.Net;
using System.Text.Json;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-061 AC1, AC7 (journey 24; ADR 0105): anyone, with no session, reads a Published story at
/// <c>GET /api/public/stories/{slug}</c> (section, headline, summary, author, publication, text as
/// written, lead image); a slug that matches no Published story is 404 <c>not_found</c> and sends
/// nothing of the story.
/// </summary>
public sealed class ReadStoryTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    internal const string Path = "/api/public/stories";

    internal static async Task<HttpResponseMessage> ReadAsync(HttpClient client, string slug) =>
        await Browser.SendAsync(client, HttpMethod.Get, $"{Path}/{slug}", null);

    [Fact]
    public async Task Given_a_Published_story_When_anyone_reads_it_without_a_session_Then_it_answers_the_story_as_written()
    {
        var byline = await factory.AddBylineAsync("Naomi Reader");
        var story = await factory.PutStoryAsync(
            "A West End church turned its basement into a free gym",
            StoryStatus.Published,
            bylineId: byline,
            slug: "west-end-church-gym",
            content: c => c with
            {
                Summary = "Rowers, kettlebells and a Thursday prayer circle.",
                Text = "On a Tuesday night in March.\n\n> We talk about the body as a temple.",
                ImageKey = "0193a9c00000700080000000000000a1.jpg",
                ImageCrop = new StoryCrop(0, 0, 1600, 900),
            });
        using var client = Browser.CreateClient(factory);

        using var response = await ReadAsync(client, "west-end-church-gym");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var read = await AdminStories.JsonAsync(response);
        Assert.Equal(["id", "slug", "section", "headline", "summary", "author", "publishedAt", "text", "image", "next", "keepReading"], AdminStories.Keys(read));
        Assert.Equal(
            (story.Id.ToString(), "west-end-church-gym", "community", "A West End church turned its basement into a free gym", "Rowers, kettlebells and a Thursday prayer circle.", "Naomi Reader"),
            (read.GetProperty("id").GetString(), read.GetProperty("slug").GetString(), read.GetProperty("section").GetString(),
             read.GetProperty("headline").GetString(), read.GetProperty("summary").GetString(), read.GetProperty("author").GetString()));
        Assert.Equal(story.PublishedAt, read.GetProperty("publishedAt").GetDateTimeOffset());
        Assert.Equal("On a Tuesday night in March.\n\n> We talk about the body as a temple.", read.GetProperty("text").GetString());
        Assert.Equal("0193a9c00000700080000000000000a1.jpg", read.GetProperty("image").GetProperty("key").GetString());
        Assert.Equal(JsonValueKind.Null, read.GetProperty("next").ValueKind);
    }

    [Theory]
    [InlineData(StoryStatus.Draft, false)]
    [InlineData(StoryStatus.InReview, false)]
    [InlineData(StoryStatus.Published, true)]
    public async Task Given_a_story_that_is_not_Published_When_its_address_is_read_Then_it_is_not_found_and_nothing_of_it_is_sent(StoryStatus status, bool unpublished)
    {
        var slug = $"hidden-{status}-{unpublished}".ToLowerInvariant();
        await factory.PutStoryAsync($"Secret headline {slug}", status, slug: slug, unpublished: unpublished, content: c => c with { Summary = "Secret summary" });
        using var client = Browser.CreateClient(factory);

        using var response = await ReadAsync(client, slug);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.Equal("not_found", JsonDocument.Parse(body).RootElement.GetProperty("code").GetString());
        Assert.DoesNotContain("Secret", body, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(true, "Run with us", "event")]
    [InlineData(false, "Run with us", null)]
    [InlineData(true, null, null)]
    public async Task Given_a_story_pointing_to_an_event_When_it_is_read_Then_the_next_step_shows_only_with_words_and_a_published_event(bool published, string? words, string? kind)
    {
        var eventId = await factory.AddStoryEventAsync($"Read Sunrise {published} {words}", factory.Time.GetUtcNow().AddDays(5), published);
        var slug = $"next-step-{published}-{words is null}".ToLowerInvariant();
        await factory.PutStoryAsync(
            $"Next step {slug}",
            StoryStatus.Published,
            slug: slug,
            content: c => c with { PointsTo = StoryPointer.Event, PointsToId = eventId, NextStepText = words });
        using var client = Browser.CreateClient(factory);

        using var response = await ReadAsync(client, slug);

        var next = (await AdminStories.JsonAsync(response)).GetProperty("next");
        if (kind is null)
        {
            Assert.Equal(JsonValueKind.Null, next.ValueKind);
        }
        else
        {
            Assert.Equal((kind, words, $"/events/{eventId}"), (next.GetProperty("kind").GetString(), next.GetProperty("text").GetString(), next.GetProperty("link").GetString()));
        }
    }

    [Theory]
    [InlineData(false, HttpStatusCode.OK)]
    [InlineData(true, HttpStatusCode.NotFound)]
    public async Task Given_a_story_whose_link_changed_When_its_former_link_is_read_Then_a_Published_one_answers_with_its_current_link(bool unpublished, HttpStatusCode expected)
    {
        var current = $"renamed-current-{unpublished}".ToLowerInvariant();
        var former = $"renamed-former-{unpublished}".ToLowerInvariant();
        await factory.PutStoryAsync($"Renamed {unpublished}", StoryStatus.Published, slug: current, formerSlug: former, unpublished: unpublished);
        using var client = Browser.CreateClient(factory);

        using var response = await ReadAsync(client, former);

        Assert.Equal(expected, response.StatusCode);
        if (expected == HttpStatusCode.OK)
        {
            Assert.Equal(current, (await AdminStories.JsonAsync(response)).GetProperty("slug").GetString());
        }
    }

    [Fact]
    public async Task Given_a_slug_no_story_has_When_it_is_read_Then_it_is_not_found()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await ReadAsync(client, "no-such-story");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
    }
}
