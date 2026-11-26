using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-060 AC1 (journey 26; ADR 0072, ADR 0108): <c>/events/feed</c>, <c>/training/feed</c>,
/// <c>/nutrition/feed</c>, <c>/faith-body/feed</c> and <c>/community/feed</c> each carry one
/// section's 30 newest stories; Pros has no feed of its own, and any other section is 404
/// <c>not_found</c>. This class has its own store, so every story in it is one of these.
/// </summary>
public sealed class SectionFeedTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    [Fact]
    public async Task Given_31_nutrition_stories_and_a_Pros_one_When_the_nutrition_feed_is_asked_for_Then_it_carries_the_30_newest_nutrition_stories_only()
    {
        var now = factory.Time.GetUtcNow();
        for (var n = 1; n <= 31; n++)
        {
            await factory.PutStoryAsync($"Nutrition {n:00}", StoryStatus.Published, now.AddDays(-40 + n), section: StorySection.Nutrition, slug: $"nutrition-{n:00}");
        }

        await factory.PutStoryAsync("Pros, not nutrition", StoryStatus.Published, now.AddHours(-2), section: StorySection.Pros, slug: "pros-not-nutrition");

        using var response = await StoryFeeds.GetAsync(factory, "/nutrition/feed");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var channel = (await StoryFeeds.DocumentAsync(response)).Root!.Element("channel")!;
        Assert.Equal(
            ("Christian Fitness: Nutrition", $"{ApiFactory.MemberAppBaseUrl}/nutrition/feed"),
            (channel.Element("title")!.Value, channel.Element(StoryFeeds.Atom + "link")!.Attribute("href")!.Value));
        Assert.Equal(Enumerable.Range(2, 30).Reverse().Select(n => $"Nutrition {n:00}"), channel.Elements("item").Select(i => i.Element("title")!.Value));
        Assert.All(channel.Elements("item"), i => Assert.Equal("Nutrition", i.Element("category")!.Value));
    }

    [Theory]
    [InlineData("/events/feed", StorySection.Events, "Events")]
    [InlineData("/training/feed", StorySection.Training, "Training")]
    [InlineData("/faith-body/feed", StorySection.FaithAndBody, "Faith & Body")]
    [InlineData("/community/feed", StorySection.Community, "Community")]
    public async Task Given_a_story_in_a_section_When_its_section_feed_is_asked_for_Then_the_feed_names_the_section_and_carries_it(string path, StorySection section, string name)
    {
        var slug = $"in-{section.ToString().ToLowerInvariant()}";
        await factory.PutStoryAsync($"A story in {name}", StoryStatus.Published, factory.Time.GetUtcNow().AddDays(-1), section: section, slug: slug);

        using var response = await StoryFeeds.GetAsync(factory, path);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var channel = (await StoryFeeds.DocumentAsync(response)).Root!.Element("channel")!;
        Assert.Equal($"Christian Fitness: {name}", channel.Element("title")!.Value);
        Assert.Equal([(name, $"A story in {name}")], channel.Elements("item").Select(i => (i.Element("category")!.Value, i.Element("title")!.Value)));
    }

    [Theory]
    [InlineData("/pros/feed")]
    [InlineData("/faith-and-body/feed")]
    [InlineData("/recipes/feed")]
    public async Task Given_a_section_with_no_feed_When_its_feed_is_asked_for_Then_it_is_404_not_found(string path)
    {
        using var response = await StoryFeeds.GetAsync(factory, path);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("not_found", problem.GetProperty("code").GetString());
    }
}
