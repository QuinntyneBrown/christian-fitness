using System.Net;
using System.Text.Json;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-069 AC13 (ADR 0097): Preview answers a story as readers will see it, whatever its status, to
/// Admins only, and is never indexed. Its next step shows only when it has words and points to a
/// published event or listing, leading to the editor's link or else that page (L2-061 AC4); an
/// unknown story is 404 <c>not_found</c>.
/// </summary>
public sealed class PreviewStoryTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    private static string PreviewOf(Guid id) => $"{AdminStories.Path}/{id}/preview";

    [Fact]
    public async Task Given_a_Draft_When_an_Admin_previews_it_Then_it_answers_the_story_as_readers_will_see_it_and_is_not_indexed()
    {
        var byline = await factory.AddBylineAsync("Preview Writer");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.preview@example.org");
        var fields = WriteStoryTests.Fields(byline);
        var listing = await factory.AddListingAsync(ChristianFitness.Domain.Directory.ListingKind.Organization, "Preview Club");
        fields["pointsTo"] = new Dictionary<string, object> { ["kind"] = "listing", ["id"] = listing };
        fields["nextStepText"] = "Find a club near you";
        fields["nextStepLink"] = "/directory";
        var (id, _) = await WriteStoryTests.CreatedAsync(client, cookie, fields);

        using var response = await AdminStories.GetAsync(client, cookie, PreviewOf(id));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("noindex", Assert.Single(response.Headers.GetValues("X-Robots-Tag")));
        var preview = await AdminStories.JsonAsync(response);
        Assert.Equal(["id", "status", "section", "headline", "summary", "author", "publishedAt", "text", "image", "next"], AdminStories.Keys(preview));
        Assert.Equal(
            (id.ToString(), "draft", "nutrition", "Fasting and training", "Preview Writer"),
            (preview.GetProperty("id").GetString(), preview.GetProperty("status").GetString(), preview.GetProperty("section").GetString(),
             preview.GetProperty("headline").GetString(), preview.GetProperty("author").GetString()));
        Assert.Equal(JsonValueKind.Null, preview.GetProperty("publishedAt").ValueKind);
        var next = preview.GetProperty("next");
        Assert.Equal(["kind", "text", "link"], AdminStories.Keys(next));
        Assert.Equal(("listing", "Find a club near you", "/directory"), (next.GetProperty("kind").GetString(), next.GetProperty("text").GetString(), next.GetProperty("link").GetString()));
    }

    [Fact]
    public async Task Given_no_next_step_words_When_previewed_Then_there_is_no_next_step()
    {
        var story = await factory.PutStoryAsync("Preview without a next step", StoryStatus.Published);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.preview.plain@example.org");

        using var response = await AdminStories.GetAsync(client, cookie, PreviewOf(story.Id));

        var preview = await AdminStories.JsonAsync(response);
        Assert.Equal(("published", JsonValueKind.Null), (preview.GetProperty("status").GetString(), preview.GetProperty("next").ValueKind));
        Assert.Equal(story.PublishedAt, preview.GetProperty("publishedAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task Given_next_step_words_and_an_event_but_no_link_When_previewed_Then_the_next_step_leads_to_the_event()
    {
        var byline = await factory.AddBylineAsync("Preview Event Writer");
        var eventId = await factory.AddStoryEventAsync("Preview Sunrise 5K", factory.Time.GetUtcNow().AddDays(5));
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.preview.event@example.org");
        var fields = WriteStoryTests.Fields(byline);
        fields["pointsTo"] = new Dictionary<string, object> { ["kind"] = "event", ["id"] = eventId };
        fields["nextStepText"] = "Run with us";
        var (id, _) = await WriteStoryTests.CreatedAsync(client, cookie, fields);

        using var response = await AdminStories.GetAsync(client, cookie, PreviewOf(id));

        var next = (await AdminStories.JsonAsync(response)).GetProperty("next");
        Assert.Equal(("event", "Run with us", $"/events/{eventId}"), (next.GetProperty("kind").GetString(), next.GetProperty("text").GetString(), next.GetProperty("link").GetString()));
    }

    [Fact]
    public async Task Given_next_step_words_that_point_to_nothing_When_previewed_Then_there_is_no_next_step()
    {
        var byline = await factory.AddBylineAsync("Preview Nowhere Writer");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.preview.nowhere@example.org");
        var fields = WriteStoryTests.Fields(byline);
        fields["nextStepText"] = "Find out more";
        fields["nextStepLink"] = "https://www.example.org/more";
        var (id, _) = await WriteStoryTests.CreatedAsync(client, cookie, fields);

        using var response = await AdminStories.GetAsync(client, cookie, PreviewOf(id));

        Assert.Equal(JsonValueKind.Null, (await AdminStories.JsonAsync(response)).GetProperty("next").ValueKind);
    }

    [Fact]
    public async Task Given_a_story_that_does_not_exist_When_previewed_Then_it_is_404_not_found()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.preview.missing@example.org");

        using var response = await AdminStories.GetAsync(client, cookie, PreviewOf(Guid.NewGuid()));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_preview_a_story_Then_it_is_refused_with_forbidden_role()
    {
        var story = await factory.PutStoryAsync("Preview for Admins only");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "joel.stories.preview@example.org", StaffRoleName.Moderator);

        using var response = await AdminStories.GetAsync(client, cookie, PreviewOf(story.Id));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("forbidden_role", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
    }
}
