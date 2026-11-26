using System.Net;
using System.Text.Json;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-061 AC12, L2-068 AC1 (journey 24; ADR 0105): the story page counts a read with
/// <c>POST /api/public/stories/{id}/reads</c>, anonymous, which adds one to a Published story's
/// tally for the Toronto day; Stories' Reads column sums its tallies. A known crawler, a story that
/// is not Published and an unknown story count none, and every answer is a silent 204.
/// </summary>
public sealed class StoryReadsTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    private const string Browser = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

    private async Task<HttpResponseMessage> CountAsync(Guid id, string? userAgent = Browser)
    {
        using var client = Api.Tests.Browser.CreateClient(factory);
        if (userAgent is not null)
        {
            client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", userAgent);
        }

        return await Api.Tests.Browser.SendAsync(client, HttpMethod.Post, $"{ReadStoryTests.Path}/{id}/reads", null);
    }

    /// <summary>The Reads column of Stories for <paramref name="id"/>, as an Admin sees it.</summary>
    private async Task<int?> ReadsAsync(Guid id, string who)
    {
        using var client = Api.Tests.Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, $"dana.reads.{who}@example.org");
        using var response = await AdminStories.GetAsync(client, cookie, AdminStories.Path);
        var row = (await AdminStories.JsonAsync(response)).GetProperty("items").EnumerateArray().Single(r => r.GetProperty("id").GetGuid() == id);
        return row.GetProperty("reads").ValueKind == JsonValueKind.Null ? null : row.GetProperty("reads").GetInt32();
    }

    [Fact]
    public async Task Given_a_Published_story_When_reads_are_counted_on_two_Toronto_days_Then_each_answers_204_and_Stories_shows_their_sum()
    {
        var story = await factory.PutStoryAsync("Counted story", StoryStatus.Published, slug: "counted-story");
        var other = await factory.PutStoryAsync("Other counted story", StoryStatus.Published, slug: "other-counted-story");

        using var first = await CountAsync(story.Id);
        using var second = await CountAsync(story.Id);
        factory.Time.Advance(TimeSpan.FromDays(1));
        using var third = await CountAsync(story.Id);
        using var elsewhere = await CountAsync(other.Id);

        Assert.Equal([HttpStatusCode.NoContent, HttpStatusCode.NoContent, HttpStatusCode.NoContent], new[] { first.StatusCode, second.StatusCode, third.StatusCode });
        Assert.Equal((3, 1), (await ReadsAsync(story.Id, "sum"), await ReadsAsync(other.Id, "sum.other")));
    }

    [Theory]
    [InlineData("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")]
    [InlineData("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)")]
    [InlineData(null)]
    public async Task Given_a_crawler_When_it_posts_a_read_Then_it_answers_204_and_counts_none(string? userAgent)
    {
        var story = await factory.PutStoryAsync($"Crawled story {userAgent?.Length}", StoryStatus.Published, slug: $"crawled-story-{userAgent?.Length ?? 0}");

        using var response = await CountAsync(story.Id, userAgent);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(0, await ReadsAsync(story.Id, $"crawler.{userAgent?.Length ?? 0}"));
    }

    [Theory]
    [InlineData(StoryStatus.Draft, false, null)]
    [InlineData(StoryStatus.Published, true, 0)]
    public async Task Given_a_story_that_is_not_Published_When_a_read_is_posted_Then_it_answers_204_and_counts_none(StoryStatus status, bool unpublished, int? reads)
    {
        var story = await factory.PutStoryAsync($"Uncounted {status} {unpublished}", status, unpublished: unpublished, slug: $"uncounted-{status}-{unpublished}".ToLowerInvariant());

        using var response = await CountAsync(story.Id);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(reads, await ReadsAsync(story.Id, $"uncounted.{status}.{unpublished}".ToLowerInvariant()));
    }

    [Fact]
    public async Task Given_no_story_with_the_id_When_a_read_is_posted_Then_it_answers_204()
    {
        using var response = await CountAsync(Guid.NewGuid());

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
