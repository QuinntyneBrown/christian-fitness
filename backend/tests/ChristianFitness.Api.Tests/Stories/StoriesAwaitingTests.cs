using System.Net;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-020 (journey 22; ADR 0097), mock <c>admin-dashboard/default</c>: the Dashboard's "Needs
/// attention" names the stories In review to an Admin, how many and the three waiting longest, each
/// with its headline, byline and when it was submitted; a Moderator, who cannot review stories, is
/// answered no <c>stories</c> key.
/// </summary>
public sealed class StoriesAwaitingTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    private const string Path = "/api/admin/dashboard/awaiting";

    [Fact]
    public async Task Given_stories_in_review_When_an_Admin_asks_Then_the_count_and_the_three_waiting_longest_come_oldest_first()
    {
        var byline = await factory.AddBylineAsync("Priya Awaiting");
        // Other tests of the class may leave a story In review, always newer than these.
        var start = factory.Time.GetUtcNow().AddDays(-1);
        var before = await factory.InReviewCountAsync();
        // Put newest first, so the order is the rule's and not the insertion's.
        for (var i = 0; i < 4; i++)
        {
            await factory.PutStoryAsync($"Waiting {i}", StoryStatus.InReview, start.AddHours(-i), byline);
        }

        await factory.PutStoryAsync("A Draft", StoryStatus.Draft, start.AddDays(-3), byline);
        await factory.PutStoryAsync("Out already", StoryStatus.Published, start.AddDays(-3), byline);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.awaiting@example.org");

        using var response = await AdminStories.GetAsync(client, cookie, Path);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var stories = (await AdminStories.JsonAsync(response)).GetProperty("stories");
        Assert.Equal(before + 4, stories.GetProperty("total").GetInt32());
        var items = stories.GetProperty("items").EnumerateArray().ToArray();
        Assert.Equal(["Waiting 3", "Waiting 2", "Waiting 1"], items.Select(s => s.GetProperty("headline").GetString()));
        Assert.All(items, s => Assert.Equal("Priya Awaiting", s.GetProperty("author").GetString()));
        Assert.Equal(start.AddHours(-3).AddMinutes(1), items[0].GetProperty("submittedAt").GetDateTimeOffset());
        Assert.All(items, s => Assert.Equal(["id", "headline", "author", "submittedAt"], AdminStories.Keys(s)));
    }

    [Fact]
    public async Task Given_a_story_in_review_When_a_Moderator_asks_Then_no_stories_key_comes()
    {
        await factory.PutStoryAsync("Not for Moderators", StoryStatus.InReview);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "joel.stories.awaiting@example.org", StaffRoleName.Moderator);

        using var response = await AdminStories.GetAsync(client, cookie, Path);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.DoesNotContain("stories", AdminStories.Keys(await AdminStories.JsonAsync(response)));
    }
}
