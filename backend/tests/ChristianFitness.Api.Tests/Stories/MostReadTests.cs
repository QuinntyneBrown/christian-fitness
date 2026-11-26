using System.Net;
using System.Text.Json;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.News;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-001 AC5 (journey 25; ADR 0107): "Most read" answers the five readable stories read most in the
/// last 7 Toronto days (today and the six before), ties going to the newer story. Reads before the
/// window and stories readers cannot see no longer count. This class has its own store.
/// </summary>
public sealed class MostReadTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    internal const string Path = "/api/public/most-read-stories";

    /// <summary>Puts <paramref name="count"/> reads of the story on the Toronto day <paramref name="daysAgo"/> before today.</summary>
    private async Task ReadOnAsync(Story story, int daysAgo, int count)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(factory.Time.GetUtcNow(), EventSchedule.Toronto).DateTime);
        var tally = StoryReadTally.First(story.Id, today.AddDays(-daysAgo));
        for (var n = 1; n < count; n++)
        {
            tally.Add();
        }

        db.StoryReadTallies.Add(tally);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Given_reads_over_eight_days_When_most_read_is_asked_for_Then_the_five_most_read_of_the_last_seven_days_come_ties_to_the_newer()
    {
        var at = factory.Time.GetUtcNow().AddDays(-20);
        var byline = await factory.AddBylineAsync("Ranked Writer");
        var oldest = await factory.PutStoryAsync("Oldest two", StoryStatus.Published, at, byline, slug: "ranked-oldest");
        var b = await factory.PutStoryAsync("Older four", StoryStatus.Published, at.AddHours(1), byline, slug: "ranked-older-four");
        var c = await factory.PutStoryAsync("Newer four", StoryStatus.Published, at.AddHours(2), byline, slug: "ranked-newer-four");
        var d = await factory.PutStoryAsync("Older two", StoryStatus.Published, at.AddHours(3), byline, slug: "ranked-older-two");
        var e = await factory.PutStoryAsync("Newer two", StoryStatus.Published, at.AddHours(4), byline, slug: "ranked-newer-two");
        var a = await factory.PutStoryAsync("Most read", StoryStatus.Published, at.AddHours(5), byline, slug: "ranked-most");
        var before = await factory.PutStoryAsync("Read before the week", StoryStatus.Published, at.AddHours(6), byline, slug: "ranked-before");
        var gone = await factory.PutStoryAsync("Unpublished", StoryStatus.Published, at.AddHours(7), byline, unpublished: true, slug: "ranked-gone");
        await ReadOnAsync(a, 6, 4);
        await ReadOnAsync(a, 0, 2);
        await ReadOnAsync(b, 1, 4);
        await ReadOnAsync(c, 3, 4);
        await ReadOnAsync(d, 2, 2);
        await ReadOnAsync(e, 0, 2);
        await ReadOnAsync(oldest, 4, 2);
        await ReadOnAsync(before, 7, 10);
        await ReadOnAsync(gone, 0, 9);
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, Path, null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var ranked = (await AdminStories.JsonAsync(response)).EnumerateArray().ToList();
        Assert.Equal(["Most read", "Newer four", "Older four", "Newer two", "Older two"], ranked.Select(s => s.GetProperty("headline").GetString()!));
        Assert.Equal(["id", "slug", "section", "headline", "summary", "author", "publishedAt", "image"], AdminStories.Keys(ranked[0]));
        Assert.Equal("ranked-most", ranked[0].GetProperty("slug").GetString());
    }
}

/// <summary>L2-001 AC5: with no reads in the week, "Most read" answers none, and the page hides it.</summary>
public sealed class MostReadNoneTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    [Fact]
    public async Task Given_no_reads_When_most_read_is_asked_for_Then_it_answers_an_empty_list()
    {
        await factory.PutStoryAsync("Unread", StoryStatus.Published, slug: "unread-story");
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, MostReadTests.Path, null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var ranked = await AdminStories.JsonAsync(response);
        Assert.Equal((JsonValueKind.Array, 0), (ranked.ValueKind, ranked.GetArrayLength()));
    }
}
