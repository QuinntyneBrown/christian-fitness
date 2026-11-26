using System.Net;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-069 AC5, AC6, AC8, AC14 (ADR 0097): Update makes a Published story's changes live at once,
/// over the version read, keeping an earlier link working when the link changes; Unpublish makes it
/// a Draft that keeps its reads; a story published or updated as the Lead story makes the previous
/// Lead an ordinary story. Each is audited.
/// </summary>
public sealed class PublishedStoryTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    private static string ActionOf(Guid id, string action) => $"{AdminStories.Path}/{id}/{action}";

    private async Task<(HttpClient Client, string Cookie, Guid Staff)> SignInAsync(string email, StaffRoleName role = StaffRoleName.Admin)
    {
        var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, email, role);
        return (client, cookie, await factory.MemberIdAsync(email));
    }

    [Fact]
    public async Task Given_a_Published_story_When_an_Admin_updates_it_Then_the_changes_are_live_it_stays_Published_and_it_is_audited()
    {
        var byline = await factory.AddBylineAsync("Update Writer");
        var story = await factory.PutStoryAsync("Update me", StoryStatus.Published, bylineId: byline, slug: "update-me");
        var (client, cookie, staff) = await SignInAsync("dana.stories.update@example.org");
        using (client)
        {
            var body = WriteStoryTests.Fields(byline, story.Version);
            body["headline"] = "Updated headline";
            body["slug"] = "update-me";

            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "update"), cookie, body);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var answer = await AdminStories.JsonAsync(response);
            Assert.Equal(("published", "Updated headline", story.Version + 1), (answer.GetProperty("status").GetString(), answer.GetProperty("headline").GetString(), answer.GetProperty("version").GetInt32()));
            var stored = (await factory.FindStoryAsync(story.Id))!;
            Assert.Equal((StoryStatus.Published, "Updated headline", story.PublishedAt), (stored.Status, stored.Headline, stored.PublishedAt));
            Assert.Equal([(staff, "story.updated", "Story")], await factory.AuditOfAsync(story.Id));
        }
    }

    [Fact]
    public async Task Given_a_Published_story_When_its_link_changes_Then_the_earlier_link_keeps_working_and_no_other_story_can_take_it()
    {
        var byline = await factory.AddBylineAsync("Relink Writer");
        var story = await factory.PutStoryAsync("Relink me", StoryStatus.Published, bylineId: byline, slug: "relink-me");
        var other = await factory.PutStoryAsync("Wants the old link", bylineId: byline);
        var (client, cookie, _) = await SignInAsync("dana.stories.relink@example.org");
        using (client)
        {
            var body = WriteStoryTests.Fields(byline, story.Version);
            body["slug"] = "relinked";
            using (var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "update"), cookie, body))
            {
                Assert.Equal("relinked", (await AdminStories.JsonAsync(response)).GetProperty("slug").GetString());
            }

            Assert.Equal(["relink-me"], (await factory.FindStoryAsync(story.Id))!.FormerSlugs);
            var taking = WriteStoryTests.Fields(byline, other.Version);
            taking["slug"] = "relink-me";
            using var refused = await WriteStoryTests.SaveAsync(client, cookie, other.Id, taking);

            Assert.Equal(HttpStatusCode.BadRequest, refused.StatusCode);
            Assert.Equal("slug_taken", (await AdminStories.JsonAsync(refused)).GetProperty("fieldCodes").GetProperty("slug").GetString());
        }
    }

    [Theory]
    [InlineData(StoryStatus.Draft)]
    [InlineData(StoryStatus.InReview)]
    public async Task Given_a_story_that_is_not_Published_When_an_Admin_updates_it_Then_it_is_refused_with_status_conflict(StoryStatus status)
    {
        var byline = await factory.AddBylineAsync($"Update {status} Writer");
        var story = await factory.PutStoryAsync($"Update {status}", status, bylineId: byline);
        var (client, cookie, _) = await SignInAsync($"dana.stories.update.{status}@example.org".ToLowerInvariant());
        using (client)
        {
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "update"), cookie, WriteStoryTests.Fields(byline, story.Version));

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal("status_conflict", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
        }
    }

    [Fact]
    public async Task Given_an_Update_with_no_headline_When_an_Admin_updates_Then_nothing_changes_and_the_headline_is_named()
    {
        var byline = await factory.AddBylineAsync("Update Empty Writer");
        var story = await factory.PutStoryAsync("Keep this headline", StoryStatus.Published, bylineId: byline);
        var (client, cookie, _) = await SignInAsync("dana.stories.update.empty@example.org");
        using (client)
        {
            var body = WriteStoryTests.Fields(byline, story.Version);
            body["headline"] = "";
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "update"), cookie, body);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal("headline_required", (await AdminStories.JsonAsync(response)).GetProperty("fieldCodes").GetProperty("headline").GetString());
            Assert.Equal("Keep this headline", (await factory.FindStoryAsync(story.Id))!.Headline);
        }
    }

    [Fact]
    public async Task Given_an_Update_over_a_version_not_seen_When_an_Admin_updates_Then_it_is_refused_with_story_changed()
    {
        var byline = await factory.AddBylineAsync("Update Stale Writer");
        var story = await factory.PutStoryAsync("Update stale", StoryStatus.Published, bylineId: byline);
        var (client, cookie, _) = await SignInAsync("dana.stories.update.stale@example.org");
        using (client)
        {
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "update"), cookie, WriteStoryTests.Fields(byline, story.Version - 1));

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal("story_changed", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
        }
    }

    [Fact]
    public async Task Given_a_Published_story_When_an_Admin_unpublishes_it_Then_it_is_a_Draft_that_keeps_its_first_publication_and_it_is_audited()
    {
        var story = await factory.PutStoryAsync("Unpublish me", StoryStatus.Published, slug: "unpublish-me");
        var (client, cookie, staff) = await SignInAsync("dana.stories.unpublish@example.org");
        using (client)
        {
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "unpublish"), cookie, new { version = story.Version });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var answer = await AdminStories.JsonAsync(response);
            Assert.Equal(("draft", System.Text.Json.JsonValueKind.Null), (answer.GetProperty("status").GetString(), answer.GetProperty("publishedAt").ValueKind));
            var stored = (await factory.FindStoryAsync(story.Id))!;
            Assert.Equal((StoryStatus.Draft, (DateTimeOffset?)null, story.FirstPublishedAt, "unpublish-me"), (stored.Status, stored.PublishedAt, stored.FirstPublishedAt, stored.Slug));
            Assert.Equal([(staff, "story.unpublished", "Story")], await factory.AuditOfAsync(story.Id));
        }
    }

    [Theory]
    [InlineData(StoryStatus.Draft)]
    [InlineData(StoryStatus.InReview)]
    public async Task Given_a_story_that_is_not_Published_When_an_Admin_unpublishes_it_Then_it_is_refused_with_status_conflict(StoryStatus status)
    {
        var story = await factory.PutStoryAsync($"Unpublish {status}", status);
        var (client, cookie, _) = await SignInAsync($"dana.stories.unpublish.{status}@example.org".ToLowerInvariant());
        using (client)
        {
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "unpublish"), cookie, new { version = story.Version });

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal("status_conflict", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
        }
    }

    [Theory]
    [InlineData("publish")]
    [InlineData("update")]
    public async Task Given_a_Lead_story_When_another_goes_out_as_the_Lead_Then_the_earlier_Lead_becomes_an_ordinary_story_at_its_own_time(string action)
    {
        var byline = await factory.AddBylineAsync($"Lead {action} Writer");
        await factory.ClearLeadsAsync();
        var lead = await factory.PutStoryAsync($"The old lead {action}", StoryStatus.Published, factory.Time.GetUtcNow().AddDays(-1), byline, placement: StoryPlacement.Lead);
        var story = await factory.PutStoryAsync($"The new lead {action}", action == "update" ? StoryStatus.Published : StoryStatus.Draft, bylineId: byline);
        var (client, cookie, _) = await SignInAsync($"dana.stories.lead.{action}@example.org");
        using (client)
        {
            var body = WriteStoryTests.Fields(byline, story.Version);
            body["placement"] = "lead";

            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, action), cookie, body);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var earlier = (await factory.FindStoryAsync(lead.Id))!;
            Assert.Equal((StoryPlacement.Latest, StoryStatus.Published, lead.PublishedAt), (earlier.Placement, earlier.Status, earlier.PublishedAt));
            Assert.Equal(StoryPlacement.Lead, (await factory.FindStoryAsync(story.Id))!.Placement);
            Assert.Equal([story.Id], await factory.PublishedLeadsAsync());
        }
    }

    [Theory]
    [InlineData("update")]
    [InlineData("unpublish")]
    public async Task Given_a_Moderator_When_they_update_or_unpublish_Then_it_is_refused_with_forbidden_role(string action)
    {
        var story = await factory.PutStoryAsync($"Moderator {action} published", StoryStatus.Published);
        var (client, cookie, _) = await SignInAsync($"joel.stories.published.{action}@example.org", StaffRoleName.Moderator);
        using (client)
        {
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, action), cookie, new { version = story.Version });

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            Assert.Equal("forbidden_role", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
        }
    }
}
