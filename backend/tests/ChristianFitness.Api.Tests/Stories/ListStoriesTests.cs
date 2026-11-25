using System.Net;
using System.Text.Json;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-068 AC1 to AC3, AC5, AC7 and AC8 (ADR 0097): an Admin lists every story newest activity
/// first with title, byline, section, status, when and reads; the tabs filter by status and each
/// counts its stories; the stories in review are called out oldest first, at most three; a
/// Moderator is refused with <c>forbidden_role</c>.
/// </summary>
public sealed class ListStoriesTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    private static readonly string[] RowKeys = ["id", "headline", "byline", "section", "status", "when", "reads"];

    [Fact]
    public async Task Given_stories_of_each_status_When_an_Admin_lists_them_Then_each_row_shows_its_story_newest_activity_first()
    {
        var byline = await factory.AddBylineAsync("Listed Writer One");
        var start = factory.Time.GetUtcNow().AddDays(-3);
        var draft = await factory.PutStoryAsync("List draft", StoryStatus.Draft, start, byline, StorySection.Nutrition);
        var review = await factory.PutStoryAsync("List review", StoryStatus.InReview, start.AddHours(1), byline, StorySection.FaithAndBody);
        var published = await factory.PutStoryAsync("List published", StoryStatus.Published, start.AddHours(2), byline, StorySection.Training);
        var unpublished = await factory.PutStoryAsync("List unpublished", StoryStatus.Published, start.AddHours(3), byline, null, unpublished: true);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.list@example.org");

        using var response = await AdminStories.GetAsync(client, cookie, AdminStories.Path);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var list = await AdminStories.JsonAsync(response);
        Assert.Equal(["counts", "inReview", "items", "page", "pageCount"], AdminStories.Keys(list));
        var rows = list.GetProperty("items").EnumerateArray()
            .Where(r => r.GetProperty("headline").GetString()!.StartsWith("List ", StringComparison.Ordinal)).ToArray();
        Assert.All(rows, r => Assert.Equal(RowKeys, AdminStories.Keys(r)));
        Assert.Equal(
            [
                (unpublished.Id.ToString(), "List unpublished", "draft", (string?)null, start.AddHours(3), (int?)0),
                (published.Id.ToString(), "List published", "published", "training", start.AddHours(2).AddMinutes(1), 0),
                (review.Id.ToString(), "List review", "review", "faith-and-body", start.AddHours(1).AddMinutes(1), null),
                (draft.Id.ToString(), "List draft", "draft", "nutrition", start, null),
            ],
            rows.Select(r => (
                r.GetProperty("id").GetString(),
                r.GetProperty("headline").GetString(),
                r.GetProperty("status").GetString(),
                r.GetProperty("section").GetString(),
                r.GetProperty("when").GetDateTimeOffset(),
                r.GetProperty("reads").ValueKind == JsonValueKind.Null ? (int?)null : r.GetProperty("reads").GetInt32())));
        Assert.All(rows, r => Assert.Equal("Listed Writer One", r.GetProperty("byline").GetString()));
    }

    [Fact]
    public async Task Given_a_tab_When_an_Admin_chooses_it_Then_only_its_stories_show_and_its_count_grows_by_each_new_one()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.tabs@example.org");
        var before = (await ListAsync(client, cookie, "?status=published")).GetProperty("counts");

        await factory.PutStoryAsync("Tab published", StoryStatus.Published);
        await factory.PutStoryAsync("Tab draft", StoryStatus.Draft);
        var published = await ListAsync(client, cookie, "?status=published");

        Assert.All(published.GetProperty("items").EnumerateArray(), r => Assert.Equal("published", r.GetProperty("status").GetString()));
        Assert.Contains("Tab published", published.GetProperty("items").EnumerateArray().Select(r => r.GetProperty("headline").GetString()));
        var after = published.GetProperty("counts");
        Assert.Equal(["all", "draft", "review", "scheduled", "published"], AdminStories.Keys(after));
        Assert.Equal(
            (Count(before, "all") + 2, Count(before, "draft") + 1, Count(before, "review"), Count(before, "scheduled"), Count(before, "published") + 1),
            (Count(after, "all"), Count(after, "draft"), Count(after, "review"), Count(after, "scheduled"), Count(after, "published")));
    }

    [Fact]
    public async Task Given_stories_in_review_When_Stories_loads_Then_the_three_longest_waiting_are_called_out_oldest_first()
    {
        var byline = await factory.AddBylineAsync("Review Card Writer");
        var start = factory.Time.GetUtcNow().AddDays(-30);
        var stories = new List<Story>();
        for (var n = 0; n < 4; n++)
        {
            stories.Add(await factory.PutStoryAsync($"Waiting {n}", StoryStatus.InReview, start.AddHours(n), byline, StorySection.Pros));
        }

        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.review@example.org");

        var list = await ListAsync(client, cookie, string.Empty);

        var cards = list.GetProperty("inReview").EnumerateArray().ToArray();
        Assert.Equal(3, cards.Length);
        Assert.All(cards, c => Assert.Equal(["id", "headline", "byline", "section", "submittedAt"], AdminStories.Keys(c)));
        Assert.Equal(
            [
                (stories[0].Id.ToString(), "Waiting 0", "Review Card Writer", "pros", start.AddMinutes(1)),
                (stories[1].Id.ToString(), "Waiting 1", "Review Card Writer", "pros", start.AddHours(1).AddMinutes(1)),
                (stories[2].Id.ToString(), "Waiting 2", "Review Card Writer", "pros", start.AddHours(2).AddMinutes(1)),
            ],
            cards.Select(c => (c.GetProperty("id").GetString(), c.GetProperty("headline").GetString(), c.GetProperty("byline").GetString(), c.GetProperty("section").GetString(), c.GetProperty("submittedAt").GetDateTimeOffset())));
    }

    [Theory]
    [InlineData("?status=archived", "status", "status_invalid")]
    [InlineData("?page=0", "page", "page_invalid")]
    public async Task Given_an_unknown_tab_or_page_When_Stories_is_asked_for_Then_it_is_refused_naming_the_field(string query, string field, string code)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, $"dana.stories.bad.{field}@example.org");

        using var response = await AdminStories.GetAsync(client, cookie, AdminStories.Path + query);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await AdminStories.JsonAsync(response);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal([field], AdminStories.Keys(problem.GetProperty("fieldCodes")));
        Assert.Equal(code, problem.GetProperty("fieldCodes").GetProperty(field).GetString());
    }

    [Theory]
    [InlineData("")]
    public async Task Given_a_Moderator_When_they_ask_for_Stories_Then_it_is_refused_with_forbidden_role(string path)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, $"joel.stories{path.Replace('/', '.')}@example.org", StaffRoleName.Moderator);

        using var response = await AdminStories.GetAsync(client, cookie, AdminStories.Path + path);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("forbidden_role", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_story_sent_for_review_When_an_Admin_reads_the_counts_Then_the_stories_to_review_grow_by_one_and_a_Moderator_gets_none()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.counts@example.org");
        var before = await CountsAsync(client, cookie);

        await factory.PutStoryAsync("Counted in review", StoryStatus.InReview);

        var after = await CountsAsync(client, cookie);
        Assert.Equal(["suggestions", "storiesInReview"], AdminStories.Keys(after));
        Assert.Equal(before.GetProperty("storiesInReview").GetInt32() + 1, after.GetProperty("storiesInReview").GetInt32());
        using var moderator = Browser.CreateClient(factory);
        var moderatorCookie = await AdminStories.SignInAsync(factory, moderator, "joel.stories.counts@example.org", StaffRoleName.Moderator);
        Assert.Equal(0, (await CountsAsync(moderator, moderatorCookie)).GetProperty("storiesInReview").GetInt32());
    }

    private static int Count(JsonElement counts, string tab) => counts.GetProperty(tab).GetInt32();

    private static async Task<JsonElement> ListAsync(HttpClient client, string cookie, string query)
    {
        using var response = await AdminStories.GetAsync(client, cookie, AdminStories.Path + query);
        response.EnsureSuccessStatusCode();
        return await AdminStories.JsonAsync(response);
    }

    private static async Task<JsonElement> CountsAsync(HttpClient client, string cookie)
    {
        using var response = await AdminStories.GetAsync(client, cookie, "/api/admin/counts");
        response.EnsureSuccessStatusCode();
        return await AdminStories.JsonAsync(response);
    }
}

/// <summary>L2-068 AC8: more than 50 stories are paged 50 at a time. Its own store, so the count is known.</summary>
public sealed class ListStoriesPagingTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    [Fact]
    public async Task Given_51_stories_When_an_Admin_lists_them_Then_the_first_page_holds_50_and_the_second_the_oldest()
    {
        var byline = await factory.AddBylineAsync("Paging Writer");
        var start = factory.Time.GetUtcNow().AddDays(-60);
        var oldest = await factory.PutStoryAsync("Paged 0", StoryStatus.Draft, start, byline);
        for (var n = 1; n <= 50; n++)
        {
            await factory.PutStoryAsync($"Paged {n}", StoryStatus.Draft, start.AddHours(n), byline);
        }

        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.paging@example.org");

        using var first = await AdminStories.GetAsync(client, cookie, AdminStories.Path);
        using var second = await AdminStories.GetAsync(client, cookie, AdminStories.Path + "?page=2");

        var one = await AdminStories.JsonAsync(first);
        var two = await AdminStories.JsonAsync(second);
        Assert.Equal((50, 1, 2), (one.GetProperty("items").GetArrayLength(), one.GetProperty("page").GetInt32(), one.GetProperty("pageCount").GetInt32()));
        Assert.Equal("Paged 50", one.GetProperty("items")[0].GetProperty("headline").GetString());
        Assert.Equal([oldest.Id.ToString()], AdminStories.Ids(two));
        Assert.Equal((2, 2), (two.GetProperty("page").GetInt32(), two.GetProperty("pageCount").GetInt32()));
    }
}
