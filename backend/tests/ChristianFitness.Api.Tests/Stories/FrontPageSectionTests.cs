using System.Net;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-001 AC3, AC4 (journey 25; ADR 0071, ADR 0105): with <c>section=&lt;slug&gt;</c> the front page
/// answers only that section's stories, newest first, as the river, with no lead and no headlines
/// whatever their placement; a section with none answers an empty river. A section this API does
/// not know is refused with 400 <c>validation_failed</c>, naming the field.
/// </summary>
public sealed class FrontPageSectionTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    private DateTimeOffset Ago(int minutes) => factory.Time.GetUtcNow().AddMinutes(-minutes);

    private Task<Story> PublishedAsync(string headline, int minutesAgo, StorySection section, StoryPlacement placement = StoryPlacement.Latest) =>
        factory.PutStoryAsync(headline, StoryStatus.Published, Ago(minutesAgo + 1), section: section, placement: placement, slug: headline.ToLowerInvariant().Replace(' ', '-'));

    private async Task PutStoriesAsync()
    {
        await factory.ClearStoriesAsync();
        await PublishedAsync("Faith old", 50, StorySection.FaithAndBody);
        await PublishedAsync("Training one", 40, StorySection.Training);
        await PublishedAsync("Faith lead", 30, StorySection.FaithAndBody, StoryPlacement.Lead);
        await PublishedAsync("Faith top", 20, StorySection.FaithAndBody, StoryPlacement.Top);
        await PublishedAsync("Events one", 10, StorySection.Events);
        await factory.PutStoryAsync("Faith draft", at: Ago(5), section: StorySection.FaithAndBody);
    }

    [Fact]
    public async Task Given_stories_in_several_sections_When_one_section_is_read_Then_only_its_stories_come_newest_first_as_the_river_with_no_top_stories()
    {
        await PutStoriesAsync();

        var page = await FrontPage.ReadAsync(factory, "?section=faith-body");

        Assert.Equal(FrontPage.Keys, AdminStories.Keys(page));
        Assert.Null(FrontPage.LeadOf(page));
        Assert.Empty(FrontPage.Of(page, "headlines"));
        Assert.Equal(["Faith top", "Faith lead", "Faith old"], FrontPage.Of(page, "latest"));
        Assert.All(page.GetProperty("latest").EnumerateArray(), story => Assert.Equal("faith-body", story.GetProperty("section").GetString()));
        Assert.Null(FrontPage.CursorOf(page));
        Assert.Empty(FrontPage.Of(page, "mostRead"));
    }

    [Fact]
    public async Task Given_a_section_with_no_stories_When_it_is_read_Then_the_river_is_empty()
    {
        await PutStoriesAsync();

        var page = await FrontPage.ReadAsync(factory, "?section=nutrition");

        Assert.Null(FrontPage.LeadOf(page));
        Assert.Equal((0, 0), (page.GetProperty("headlines").GetArrayLength(), page.GetProperty("latest").GetArrayLength()));
    }

    [Theory]
    [InlineData("faith-and-body")]
    [InlineData("Events")]
    [InlineData("latest")]
    [InlineData("recipes")]
    public async Task Given_a_section_the_API_does_not_know_When_it_is_read_Then_it_is_refused_with_validation_failed_naming_the_section(string section)
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{FrontPage.Path}?section={section}", cookie: null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await AdminStories.JsonAsync(response);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal(["section"], AdminStories.Keys(problem.GetProperty("errors")));
        Assert.Equal("section_invalid", problem.GetProperty("fieldCodes").GetProperty("section").GetString());
    }
}
