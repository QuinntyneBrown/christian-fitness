using System.Net;
using System.Text.Json;
using ChristianFitness.Api.Tests.DirectoryListings;
using ChristianFitness.Api.Tests.Stories;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Feedback;

/// <summary>
/// L2-063 AC1 to AC3 (journey 30; ADR 0109): <c>GET /api/feedback/form</c> answers the signed-in
/// member's address for the email choice and, for an <c>about</c> the server knows, the label the
/// form shows as "About this page": a page type for a member route template, "Story › headline"
/// for a story readers can see. Anything else is no label. A visitor is refused 401.
/// </summary>
public sealed class FeedbackFormTests(FeedbackFactory factory) : IClassFixture<FeedbackFactory>
{
    private static async Task<JsonElement> FormAsync(HttpClient client, string cookie, string? about = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri(about is null ? FeedbackFactory.FormPath : $"{FeedbackFactory.FormPath}?about={Uri.EscapeDataString(about)}", UriKind.Relative));
        request.Headers.Add("Cookie", cookie);
        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await SuggestListingTests.BodyAsync(response);
    }

    [Fact]
    public async Task Given_a_signed_in_member_When_the_form_opens_Then_it_names_their_address_and_no_page()
    {
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, "grace.form@example.org");
        using var _ = client;

        var form = await FormAsync(client, cookie);

        Assert.Equal(["about", "email"], form.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("grace.form@example.org", form.GetProperty("email").GetString());
        Assert.Equal(JsonValueKind.Null, form.GetProperty("about").ValueKind);
    }

    /// <summary>ADR 0109's table of member pages the footer shows on, one row each.</summary>
    [Theory]
    [InlineData("page:home", "Home")]
    [InlineData("page:events", "Events")]
    [InlineData("page:events/:id", "Event")]
    [InlineData("page:events/series/:id", "Event series")]
    [InlineData("page:events/series/:id/chat", "Group chat")]
    [InlineData("page:events/:id/chat", "Group chat")]
    [InlineData("page:directory", "Directory")]
    [InlineData("page:directory/suggest", "Suggest a listing")]
    [InlineData("page:directory/:id", "Listing")]
    [InlineData("page:claim/:token", "Claim a listing")]
    [InlineData("page:services", "Services")]
    [InlineData("page:services/:id", "Professional")]
    [InlineData("page:members/:id", "Member")]
    [InlineData("page:notifications", "Notifications")]
    [InlineData("page:stories/:slug", "Story")]
    [InlineData("page:profile", "Profile")]
    [InlineData("page:feedback", "Send feedback")]
    public async Task Given_a_member_page_When_the_form_opens_about_it_Then_its_page_type_is_the_label(string about, string label)
    {
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, $"grace.page.{Math.Abs(about.GetHashCode(StringComparison.Ordinal))}@example.org");
        using var _ = client;

        var form = await FormAsync(client, cookie, about);

        var shown = form.GetProperty("about");
        Assert.Equal(["label"], shown.EnumerateObject().Select(p => p.Name));
        Assert.Equal(label, shown.GetProperty("label").GetString());
    }

    [Fact]
    public async Task Given_a_published_story_When_the_form_opens_about_it_Then_the_label_names_the_story()
    {
        var story = await factory.PutStoryAsync("A West End church turned its basement into a free gym", StoryStatus.Published, slug: "west-end-basement-gym");
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, "grace.story@example.org");
        using var _ = client;

        var form = await FormAsync(client, cookie, $"story:{story.Id}");

        Assert.Equal("Story › A West End church turned its basement into a free gym", form.GetProperty("about").GetProperty("label").GetString());
    }

    /// <summary>What the server does not know, or readers cannot see, gives no label.</summary>
    [Theory]
    [InlineData("draft story")]
    [InlineData("unpublished story")]
    [InlineData("unknown story")]
    [InlineData("page:messages")]
    [InlineData("page:admin/events")]
    [InlineData("page:Home")]
    [InlineData("page:")]
    [InlineData("story:not-a-guid")]
    [InlineData("events/:id")]
    [InlineData("<b>bold</b>")]
    public async Task Given_an_about_the_server_does_not_know_When_the_form_opens_Then_there_is_no_label(string about)
    {
        var sent = about switch
        {
            "draft story" => $"story:{(await factory.PutStoryAsync("A draft about feedback", StoryStatus.Draft, slug: "draft-about-feedback")).Id}",
            "unpublished story" => $"story:{(await factory.PutStoryAsync("Pulled about feedback", StoryStatus.Published, slug: "pulled-about-feedback", unpublished: true)).Id}",
            "unknown story" => $"story:{Guid.NewGuid()}",
            _ => about,
        };
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, $"grace.unknown.{Math.Abs(about.GetHashCode(StringComparison.Ordinal))}@example.org");
        using var _ = client;

        var form = await FormAsync(client, cookie, sent);

        Assert.Equal(JsonValueKind.Null, form.GetProperty("about").ValueKind);
    }

    [Fact]
    public async Task Given_a_visitor_When_they_ask_for_the_form_Then_it_is_refused_401()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await client.GetAsync(new Uri(FeedbackFactory.FormPath, UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
