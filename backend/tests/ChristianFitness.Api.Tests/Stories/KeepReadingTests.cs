using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-061 AC6 (journey 24; ADR 0105): "Keep reading" holds three other Published stories, those of
/// the story's section first, then the rest, each newest first, with what a card shows. This class
/// has its own store, so every story in it is one of these.
/// </summary>
public sealed class KeepReadingTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    [Fact]
    public async Task Given_other_stories_When_a_story_is_read_Then_Keep_reading_holds_three_others_of_its_section_first_newest_first()
    {
        var at = factory.Time.GetUtcNow();
        var byline = await factory.AddBylineAsync("Keep Writer");
        await factory.PutStoryAsync("The one being read", StoryStatus.Published, at, byline, StorySection.Training, slug: "being-read");
        await factory.PutStoryAsync("Older training", StoryStatus.Published, at.AddDays(1), byline, StorySection.Training, slug: "older-training");
        await factory.PutStoryAsync(
            "Newer training",
            StoryStatus.Published,
            at.AddDays(2),
            byline,
            StorySection.Training,
            slug: "newer-training",
            content: c => c with { ImageKey = "0193a9c00000700080000000000000b2.jpg", ImageCrop = new StoryCrop(0, 0, 1600, 900) });
        await factory.PutStoryAsync("Older community", StoryStatus.Published, at.AddDays(5), byline, StorySection.Community, slug: "older-community");
        await factory.PutStoryAsync("Newest community", StoryStatus.Published, at.AddDays(6), byline, StorySection.Community, slug: "newest-community");
        await factory.PutStoryAsync("Training draft", StoryStatus.Draft, at.AddDays(7), byline, StorySection.Training, slug: "training-draft");
        await factory.PutStoryAsync("Training unpublished", StoryStatus.Published, at.AddDays(8), byline, StorySection.Training, unpublished: true, slug: "training-unpublished");
        using var client = Browser.CreateClient(factory);

        using var response = await ReadStoryTests.ReadAsync(client, "being-read");

        var cards = (await AdminStories.JsonAsync(response)).GetProperty("keepReading").EnumerateArray().ToList();
        Assert.Equal(["newer-training", "older-training", "newest-community"], cards.Select(c => c.GetProperty("slug").GetString()));
        Assert.Equal(["slug", "section", "headline", "author", "publishedAt", "image"], AdminStories.Keys(cards[0]));
        Assert.Equal(
            ("training", "Newer training", "Keep Writer", at.AddDays(2).AddMinutes(1), "0193a9c00000700080000000000000b2.jpg"),
            (cards[0].GetProperty("section").GetString(), cards[0].GetProperty("headline").GetString(), cards[0].GetProperty("author").GetString(),
             cards[0].GetProperty("publishedAt").GetDateTimeOffset(), cards[0].GetProperty("image").GetProperty("key").GetString()));
    }
}
