using System.Net;
using System.Text.Json;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-069 AC2, AC3, AC6, AC7, AC14 (ADR 0097): Send for review makes a Draft In review, Back to
/// draft makes it a Draft again, and Publish now or Approve &amp; publish saves the fields and
/// publishes a Draft or a story In review at once, each over the version the editor read and each
/// audited. Publishing with a headline, text, section or byline missing publishes nothing and names
/// each field; an action the status does not allow is 409 <c>status_conflict</c>.
/// </summary>
public sealed class StoryStatusTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    private static string ActionOf(Guid id, string action) => $"{AdminStories.Path}/{id}/{action}";

    private async Task<(HttpClient Client, string Cookie, Guid Staff)> SignInAsync(string email, StaffRoleName role = StaffRoleName.Admin)
    {
        var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, email, role);
        return (client, cookie, await factory.MemberIdAsync(email));
    }

    [Fact]
    public async Task Given_a_Draft_When_an_Admin_sends_it_for_review_Then_it_is_In_review_and_audited()
    {
        var story = await factory.PutStoryAsync("Status submit");
        var (client, cookie, staff) = await SignInAsync("dana.stories.submit@example.org");
        using (client)
        {
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "submit"), cookie, new { version = story.Version });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var answer = await AdminStories.JsonAsync(response);
            Assert.Equal(("review", story.Version + 1), (answer.GetProperty("status").GetString(), answer.GetProperty("version").GetInt32()));
            Assert.Equal(StoryStatus.InReview, (await factory.FindStoryAsync(story.Id))!.Status);
            Assert.Equal([(staff, "story.submitted", "Story")], await factory.AuditOfAsync(story.Id));
        }
    }

    [Fact]
    public async Task Given_a_story_In_review_When_an_Admin_takes_it_back_to_draft_Then_it_is_a_Draft_and_audited()
    {
        var story = await factory.PutStoryAsync("Status back to draft", StoryStatus.InReview);
        var (client, cookie, staff) = await SignInAsync("dana.stories.back@example.org");
        using (client)
        {
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "return-to-draft"), cookie, new { version = story.Version });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("draft", (await AdminStories.JsonAsync(response)).GetProperty("status").GetString());
            Assert.Equal(StoryStatus.Draft, (await factory.FindStoryAsync(story.Id))!.Status);
            Assert.Equal([(staff, "story.returned_to_draft", "Story")], await factory.AuditOfAsync(story.Id));
        }
    }

    [Theory]
    [InlineData("submit", StoryStatus.InReview)]
    [InlineData("submit", StoryStatus.Published)]
    [InlineData("return-to-draft", StoryStatus.Draft)]
    [InlineData("return-to-draft", StoryStatus.Published)]
    public async Task Given_a_status_that_does_not_allow_it_When_an_Admin_acts_Then_it_is_refused_with_status_conflict(string action, StoryStatus status)
    {
        var story = await factory.PutStoryAsync($"Status conflict {action} {status}", status);
        var (client, cookie, _) = await SignInAsync($"dana.stories.conflict.{action}.{status}@example.org".ToLowerInvariant());
        using (client)
        {
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, action), cookie, new { version = story.Version });

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal("status_conflict", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
            Assert.Equal(status, (await factory.FindStoryAsync(story.Id))!.Status);
            Assert.Empty(await factory.AuditOfAsync(story.Id));
        }
    }

    [Theory]
    [InlineData("submit")]
    [InlineData("publish")]
    public async Task Given_a_version_the_editor_has_not_seen_When_an_Admin_acts_Then_it_is_refused_with_story_changed(string action)
    {
        var byline = await factory.AddBylineAsync($"Stale {action} Writer");
        var story = await factory.PutStoryAsync($"Status stale {action}", bylineId: byline);
        var (client, cookie, _) = await SignInAsync($"dana.stories.stale.{action}@example.org");
        using (client)
        {
            var body = WriteStoryTests.Fields(byline, story.Version - 1);
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, action), cookie, body);

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal("story_changed", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
            Assert.Equal(StoryStatus.Draft, (await factory.FindStoryAsync(story.Id))!.Status);
        }
    }

    [Theory]
    [InlineData(StoryStatus.Draft, "story.published")]
    [InlineData(StoryStatus.InReview, "story.published")]
    public async Task Given_a_Draft_or_a_story_In_review_When_an_Admin_publishes_it_Then_the_fields_are_saved_it_is_published_now_under_a_link_from_its_headline_and_audited(StoryStatus status, string action)
    {
        var byline = await factory.AddBylineAsync($"Publish {status} Writer");
        var story = await factory.PutStoryAsync($"Publish from {status}", status, bylineId: byline);
        var (client, cookie, staff) = await SignInAsync($"dana.stories.publish.{status}@example.org".ToLowerInvariant());
        using (client)
        {
            var body = WriteStoryTests.Fields(byline, story.Version);
            body["headline"] = $"Fasting and training, from {status}";

            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "publish"), cookie, body);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var answer = await AdminStories.JsonAsync(response);
            Assert.Equal(
                ("published", $"Fasting and training, from {status}", $"fasting-and-training-from-{status}".ToLowerInvariant()),
                (answer.GetProperty("status").GetString(), answer.GetProperty("headline").GetString(), answer.GetProperty("slug").GetString()));
            Assert.Equal(factory.Time.GetUtcNow(), answer.GetProperty("publishedAt").GetDateTimeOffset());
            var stored = (await factory.FindStoryAsync(story.Id))!;
            Assert.Equal((StoryStatus.Published, "Lena Park on keeping a fast and keeping moving."), (stored.Status, stored.Summary));
            Assert.Equal([(staff, action, "Story")], await factory.AuditOfAsync(story.Id));
        }
    }

    [Fact]
    public async Task Given_a_link_another_story_was_made_from_When_a_story_with_the_same_headline_is_published_Then_its_link_takes_a_number()
    {
        var byline = await factory.AddBylineAsync("Publish Twice Writer");
        await factory.PutStoryAsync("Twin headline", StoryStatus.Published, bylineId: byline, slug: "twin-headline");
        var story = await factory.PutStoryAsync("Twin headline draft", bylineId: byline);
        var (client, cookie, _) = await SignInAsync("dana.stories.publish.twin@example.org");
        using (client)
        {
            var body = WriteStoryTests.Fields(byline, story.Version);
            body["headline"] = "Twin headline";

            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "publish"), cookie, body);

            Assert.Equal("twin-headline-2", (await AdminStories.JsonAsync(response)).GetProperty("slug").GetString());
        }
    }

    public static TheoryData<string, object?, string> MissingFields => new()
    {
        { "headline", "  ", "headline_required" },
        { "text", "", "text_required" },
        { "section", null, "section_required" },
        { "bylineId", null, "byline_required" },
    };

    [Theory]
    [MemberData(nameof(MissingFields))]
    public async Task Given_a_field_publishing_needs_is_missing_When_an_Admin_publishes_Then_nothing_is_published_and_the_field_is_named(string field, object? value, string code)
    {
        var byline = await factory.AddBylineAsync($"Missing {field} Writer");
        var story = await factory.PutStoryAsync($"Publish missing {field}", bylineId: byline);
        var (client, cookie, _) = await SignInAsync($"dana.stories.missing.{field}@example.org".ToLowerInvariant());
        using (client)
        {
            var body = WriteStoryTests.Fields(byline, story.Version);
            body[field] = value;

            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "publish"), cookie, body);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var problem = await AdminStories.JsonAsync(response);
            Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
            var fieldCodes = problem.GetProperty("fieldCodes");
            Assert.Equal([field], AdminStories.Keys(fieldCodes));
            Assert.Equal(code, fieldCodes.GetProperty(field).GetString());
            var stored = (await factory.FindStoryAsync(story.Id))!;
            Assert.Equal((StoryStatus.Draft, story.Version), (stored.Status, stored.Version));
            Assert.Empty(await factory.AuditOfAsync(story.Id));
        }
    }

    [Fact]
    public async Task Given_everything_missing_When_an_Admin_publishes_Then_every_missing_field_is_named()
    {
        var story = await factory.PutStoryAsync("Publish nothing written");
        var (client, cookie, _) = await SignInAsync("dana.stories.missing.all@example.org");
        using (client)
        {
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "publish"), cookie, new { version = story.Version });

            var fieldCodes = (await AdminStories.JsonAsync(response)).GetProperty("fieldCodes");
            Assert.Equal(["headline", "text", "section", "bylineId"], AdminStories.Keys(fieldCodes));
        }
    }

    [Fact]
    public async Task Given_a_Published_story_When_an_Admin_publishes_it_again_Then_it_is_refused_with_status_conflict()
    {
        var byline = await factory.AddBylineAsync("Publish Again Writer");
        var story = await factory.PutStoryAsync("Publish again", StoryStatus.Published, bylineId: byline);
        var (client, cookie, _) = await SignInAsync("dana.stories.publish.again@example.org");
        using (client)
        {
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "publish"), cookie, WriteStoryTests.Fields(byline, story.Version));

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal("status_conflict", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
        }
    }

    [Theory]
    [InlineData("submit")]
    [InlineData("return-to-draft")]
    [InlineData("publish")]
    public async Task Given_a_Moderator_When_they_act_on_a_story_Then_it_is_refused_with_forbidden_role(string action)
    {
        var story = await factory.PutStoryAsync($"Moderator {action}");
        var (client, cookie, _) = await SignInAsync($"joel.stories.{action}@example.org", StaffRoleName.Moderator);
        using (client)
        {
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, action), cookie, new { version = story.Version });

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            Assert.Equal("forbidden_role", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
        }
    }

    [Fact]
    public async Task Given_a_story_that_does_not_exist_When_an_Admin_sends_it_for_review_Then_it_is_404_not_found()
    {
        var (client, cookie, _) = await SignInAsync("dana.stories.submit.missing@example.org");
        using (client)
        {
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(Guid.NewGuid(), "submit"), cookie, new { version = 1 });

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.Equal(JsonValueKind.String, (await AdminStories.JsonAsync(response)).GetProperty("code").ValueKind);
        }
    }
}
