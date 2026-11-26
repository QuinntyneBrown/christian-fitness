using System.Net;
using System.Text.Json;
using ChristianFitness.Api.Tests.DirectoryListings;
using ChristianFitness.Domain.Feedback;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Feedback;

/// <summary>
/// L2-063 AC6, AC10 and AC12 (journey 30; ADR 0109): a signed-in member sends a note to
/// <c>POST /api/feedback</c> as <c>multipart/form-data</c>. It is stored New with its kind, its
/// text trimmed, the page or story it is about and the label the server gave it, the member, the
/// time, the OS family and the browser family and major version read from the request, and the
/// email choice, and answered 204 with no body. A suspended member's note is accepted like any
/// other. A visitor is refused 401, and no member can read notes back.
/// </summary>
public sealed class SendFeedbackTests(FeedbackFactory factory) : IClassFixture<FeedbackFactory>
{
    /// <summary>iOS 18 Safari on an iPhone, as the mock's note was sent from.</summary>
    internal const string IPhoneSafari =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

    internal static Dictionary<string, string?> Note(string kind = "idea", string text = "Could the series page show which week of the plan each session is?", string? about = "page:events/series/:id", string mayEmail = "true") => new(StringComparer.Ordinal)
    {
        ["kind"] = kind,
        ["text"] = text,
        ["about"] = about,
        ["mayEmail"] = mayEmail,
    };

    /// <summary>Posts <paramref name="fields"/> as the member app does, with an optional screenshot and User-Agent.</summary>
    internal static async Task<HttpResponseMessage> PostAsync(
        HttpClient client, string? cookie, IReadOnlyDictionary<string, string?> fields, (byte[] Bytes, string Name, string Type)? screenshot = null, string? userAgent = IPhoneSafari)
    {
        using var content = new MultipartFormDataContent();
        foreach (var (name, value) in fields)
        {
            if (value is not null)
            {
                content.Add(new StringContent(value), name);
            }
        }

        if (screenshot is { } file)
        {
            var part = new ByteArrayContent(file.Bytes);
            part.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(file.Type);
            content.Add(part, "screenshot", file.Name);
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(FeedbackFactory.Path, UriKind.Relative)) { Content = content };
        if (cookie is not null)
        {
            request.Headers.Add("Cookie", cookie);
        }

        if (userAgent is not null)
        {
            request.Headers.TryAddWithoutValidation("User-Agent", userAgent);
        }

        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }

    [Fact]
    public async Task Given_a_note_about_a_page_When_the_member_sends_it_Then_it_is_stored_new_with_its_context()
    {
        const string email = "grace.send1@example.org";
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, email);
        using var _ = client;

        using var response = await PostAsync(client, cookie, Note(kind: "problem", text: "  The calendar button opens a blank page.  ", mayEmail: "false"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
        var note = Assert.Single(await factory.NotesOfAsync(email));
        Assert.Equal(FeedbackKind.Problem, note.Kind);
        Assert.Equal("The calendar button opens a blank page.", note.Text);
        Assert.Equal("events/series/:id", note.PageRouteTemplate);
        Assert.Equal("Event series", note.PageTitle);
        Assert.Null(note.StoryId);
        Assert.False(note.MayEmail);
        Assert.Equal("iOS", note.Device);
        Assert.Equal("Safari 18", note.Browser);
        Assert.Null(note.ScreenshotKey);
        Assert.Equal(FeedbackStatus.New, note.Status);
        Assert.Equal(factory.Time.GetUtcNow(), note.SentAt);
    }

    [Fact]
    public async Task Given_a_correction_about_a_story_When_the_member_sends_it_Then_the_story_and_its_label_are_stored()
    {
        const string email = "grace.send2@example.org";
        var story = await factory.PutStoryAsync("Twelve GTA churches will run the Toronto Half", StoryStatus.Published, slug: "twelve-churches-half");
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, email);
        using var _ = client;

        using var response = await PostAsync(client, cookie, Note(kind: "correction", text: "RCCG Jesus House is missing from the list.", about: $"story:{story.Id}"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var note = Assert.Single(await factory.NotesOfAsync(email));
        Assert.Equal(FeedbackKind.Correction, note.Kind);
        Assert.Equal(story.Id, note.StoryId);
        Assert.Null(note.PageRouteTemplate);
        Assert.Equal("Story › Twelve GTA churches will run the Toronto Half", note.PageTitle);
        Assert.True(note.MayEmail);
    }

    [Theory]
    [InlineData("idea", FeedbackKind.Idea)]
    [InlineData("problem", FeedbackKind.Problem)]
    [InlineData("correction", FeedbackKind.Correction)]
    [InlineData("thanks", FeedbackKind.Thanks)]
    public async Task Given_each_kind_and_no_page_When_sent_Then_it_is_stored_with_that_kind_and_no_page(string kind, FeedbackKind expected)
    {
        var email = $"grace.kind.{kind}@example.org";
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, email);
        using var _ = client;

        using var response = await PostAsync(client, cookie, Note(kind: kind, about: null));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var note = Assert.Single(await factory.NotesOfAsync(email));
        Assert.Equal(expected, note.Kind);
        Assert.Null(note.PageRouteTemplate);
        Assert.Null(note.PageTitle);
        Assert.Null(note.StoryId);
    }

    [Fact]
    public async Task Given_a_request_naming_no_user_agent_When_sent_Then_the_device_and_browser_are_other()
    {
        const string email = "grace.send.noagent@example.org";
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, email);
        using var _ = client;

        using var response = await PostAsync(client, cookie, Note(), userAgent: null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var note = Assert.Single(await factory.NotesOfAsync(email));
        Assert.Equal("Other", note.Device);
        Assert.Equal("Other", note.Browser);
    }

    [Fact]
    public async Task Given_a_suspended_member_When_they_send_feedback_Then_it_is_accepted_as_an_appeal()
    {
        const string email = "grace.suspended.appeal@example.org";
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, email);
        using var _ = client;
        await factory.SuspendAsync(email);

        using var response = await PostAsync(client, cookie, Note(kind: "thanks", text: "Please look at my suspension again."));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Single(await factory.NotesOfAsync(email));
    }

    [Fact]
    public async Task Given_a_visitor_When_they_send_feedback_Then_it_is_refused_401()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await PostAsync(client, null, Note());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_member_When_they_ask_to_read_notes_Then_there_is_nothing_to_read()
    {
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, "grace.read@example.org");
        using var _ = client;
        using (var sent = await PostAsync(client, cookie, Note()))
        {
            Assert.Equal(HttpStatusCode.NoContent, sent.StatusCode);
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri(FeedbackFactory.Path, UriKind.Relative));
        request.Headers.Add("Cookie", cookie);
        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
    }

    internal static async Task<JsonElement> BodyAsync(HttpResponseMessage response) => await SuggestListingTests.BodyAsync(response);
}
