using System.Globalization;
using System.Net;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-069 AC2, AC3, AC4, AC7, AC14 (ADR 0069, ADR 0104): with a Toronto date and time after now,
/// Schedule (or Approve &amp; schedule) saves the fields and makes a Draft or a story In review
/// Scheduled for that time; a time not after now, or a date or time missing, schedules nothing and
/// names the field. Before its time a Scheduled story can be unscheduled back to a Draft or
/// published now. Every read treats a Scheduled story whose time has passed as Published, and a
/// command treats it so too: it can no longer be unscheduled. Each change is audited.
/// </summary>
public sealed class ScheduleStoryTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    private static string ActionOf(Guid id, string action) => $"{AdminStories.Path}/{id}/{action}";

    private async Task<(HttpClient Client, string Cookie, Guid Staff)> SignInAsync(string email)
    {
        var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, email, StaffRoleName.Admin);
        return (client, cookie, await factory.MemberIdAsync(email));
    }

    /// <summary>The editor's fields with the Toronto date and time of <paramref name="at"/>.</summary>
    private static Dictionary<string, object?> ScheduleBody(Guid byline, int version, DateTimeOffset at)
    {
        var (date, time) = EventSchedule.TorontoOf(at);
        var body = WriteStoryTests.Fields(byline, version);
        body["publishDate"] = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        body["publishTime"] = time.ToString("HH:mm", CultureInfo.InvariantCulture);
        return body;
    }

    [Theory]
    [InlineData(StoryStatus.Draft)]
    [InlineData(StoryStatus.InReview)]
    public async Task Given_a_Draft_or_a_story_In_review_When_an_Admin_schedules_it_for_a_time_after_now_Then_it_is_Scheduled_for_that_time_with_its_fields_saved_and_audited(StoryStatus status)
    {
        var byline = await factory.AddBylineAsync($"Schedule {status} Writer");
        var story = await factory.PutStoryAsync($"Schedule from {status}", status, bylineId: byline);
        var (client, cookie, staff) = await SignInAsync($"dana.stories.schedule.{status}@example.org".ToLowerInvariant());
        using (client)
        {
            // Two days on, at a whole minute, as the editor's date and time can name it.
            var at = factory.Time.GetUtcNow().AddDays(2).AddSeconds(-factory.Time.GetUtcNow().Second);
            var body = ScheduleBody(byline, story.Version, at);
            body["headline"] = $"Scheduled from {status}";

            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "schedule"), cookie, body);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var answer = await AdminStories.JsonAsync(response);
            Assert.Equal(WriteStoryTests.StoryKeys, AdminStories.Keys(answer));
            Assert.Equal(("scheduled", $"Scheduled from {status}"), (answer.GetProperty("status").GetString(), answer.GetProperty("headline").GetString()));
            Assert.Equal(at, answer.GetProperty("publishAt").GetDateTimeOffset());
            var stored = (await factory.FindStoryAsync(story.Id))!;
            Assert.Equal((StoryStatus.Scheduled, at, (DateTimeOffset?)null), (stored.Status, stored.PublishAt!.Value, stored.PublishedAt));
            Assert.Equal([(staff, "story.scheduled", "Story")], await factory.AuditOfAsync(story.Id));

            using var list = await AdminStories.GetAsync(client, cookie, $"{AdminStories.Path}?status=scheduled");
            var row = (await AdminStories.JsonAsync(list)).GetProperty("items").EnumerateArray().Single(r => r.GetProperty("id").GetGuid() == story.Id);
            Assert.Equal(at, row.GetProperty("when").GetDateTimeOffset());
        }
    }

    [Theory]
    [InlineData(0, "publishDate", "publish_at_in_past")]
    [InlineData(-60, "publishDate", "publish_at_in_past")]
    [InlineData(null, "publishDate", "publish_date_required")]
    [InlineData(1, "publishTime", "publish_time_required")]
    public async Task Given_a_time_not_after_now_or_a_date_or_time_missing_When_an_Admin_schedules_Then_nothing_is_scheduled_and_the_field_is_named(int? minutesFromNow, string field, string code)
    {
        var byline = await factory.AddBylineAsync($"Schedule refused {code} {minutesFromNow}"[..30]);
        var story = await factory.PutStoryAsync($"Schedule refused {field} {code} {minutesFromNow}", bylineId: byline);
        var (client, cookie, _) = await SignInAsync($"dana.stories.schedule.refused.{code}.{minutesFromNow}@example.org".Replace("-", "m", StringComparison.Ordinal));
        using (client)
        {
            // The clock is at a whole minute, so "now" is a time the editor can name.
            var body = ScheduleBody(byline, story.Version, factory.Time.GetUtcNow().AddMinutes(minutesFromNow ?? 0));
            if (minutesFromNow is null)
            {
                body["publishDate"] = null;
            }

            if (code == "publish_time_required")
            {
                body["publishTime"] = "6 o'clock";
            }

            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "schedule"), cookie, body);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var problem = await AdminStories.JsonAsync(response);
            Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
            Assert.Equal([field], AdminStories.Keys(problem.GetProperty("fieldCodes")));
            Assert.Equal(code, problem.GetProperty("fieldCodes").GetProperty(field).GetString());
            var stored = (await factory.FindStoryAsync(story.Id))!;
            Assert.Equal((StoryStatus.Draft, story.Version, (DateTimeOffset?)null), (stored.Status, stored.Version, stored.PublishAt));
            Assert.Empty(await factory.AuditOfAsync(story.Id));
        }
    }

    [Fact]
    public async Task Given_a_Draft_with_no_headline_When_an_Admin_schedules_it_Then_nothing_is_scheduled_and_the_headline_is_named()
    {
        var byline = await factory.AddBylineAsync("Schedule No Headline Writer");
        var story = await factory.PutStoryAsync("Schedule no headline", bylineId: byline);
        var (client, cookie, _) = await SignInAsync("dana.stories.schedule.noheadline@example.org");
        using (client)
        {
            var body = ScheduleBody(byline, story.Version, factory.Time.GetUtcNow().AddDays(1));
            body["headline"] = " ";

            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "schedule"), cookie, body);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var problem = await AdminStories.JsonAsync(response);
            Assert.Equal(["headline"], AdminStories.Keys(problem.GetProperty("fieldCodes")));
            Assert.Equal(StoryStatus.Draft, (await factory.FindStoryAsync(story.Id))!.Status);
        }
    }

    [Theory]
    [InlineData(StoryStatus.Published)]
    [InlineData(StoryStatus.Scheduled)]
    public async Task Given_a_story_already_Published_or_Scheduled_When_an_Admin_schedules_it_Then_it_is_refused_with_status_conflict(StoryStatus status)
    {
        var byline = await factory.AddBylineAsync($"Schedule Conflict {status} W");
        var story = await factory.PutStoryAsync($"Schedule conflict {status}", status, bylineId: byline);
        var (client, cookie, _) = await SignInAsync($"dana.stories.schedule.conflict.{status}@example.org".ToLowerInvariant());
        using (client)
        {
            var body = ScheduleBody(byline, story.Version, factory.Time.GetUtcNow().AddDays(3));

            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "schedule"), cookie, body);

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal("status_conflict", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
            Assert.Equal(status, (await factory.FindStoryAsync(story.Id))!.Status);
        }
    }

    [Fact]
    public async Task Given_a_Scheduled_story_before_its_time_When_an_Admin_unschedules_it_Then_it_is_a_Draft_with_no_time_and_audited()
    {
        var story = await factory.PutStoryAsync("Unschedule me", StoryStatus.Scheduled, publishAt: factory.Time.GetUtcNow().AddHours(5));
        var (client, cookie, staff) = await SignInAsync("dana.stories.unschedule@example.org");
        using (client)
        {
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "unschedule"), cookie, new { version = story.Version });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var answer = await AdminStories.JsonAsync(response);
            Assert.Equal(("draft", (string?)null), (answer.GetProperty("status").GetString(), answer.GetProperty("publishAt").GetString()));
            var stored = (await factory.FindStoryAsync(story.Id))!;
            Assert.Equal((StoryStatus.Draft, (DateTimeOffset?)null), (stored.Status, stored.PublishAt));
            Assert.Equal([(staff, "story.unscheduled", "Story")], await factory.AuditOfAsync(story.Id));
        }
    }

    [Fact]
    public async Task Given_a_Scheduled_story_before_its_time_When_an_Admin_publishes_it_now_Then_it_is_Published_now_and_audited()
    {
        var byline = await factory.AddBylineAsync("Publish Scheduled Now Writer");
        var story = await factory.PutStoryAsync("Publish scheduled now", StoryStatus.Scheduled, bylineId: byline, publishAt: factory.Time.GetUtcNow().AddHours(5));
        var (client, cookie, staff) = await SignInAsync("dana.stories.publishscheduled@example.org");
        using (client)
        {
            var body = WriteStoryTests.Fields(byline, story.Version);
            body["headline"] = "Published before its time";

            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "publish"), cookie, body);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var answer = await AdminStories.JsonAsync(response);
            Assert.Equal(("published", "Published before its time"), (answer.GetProperty("status").GetString(), answer.GetProperty("headline").GetString()));
            Assert.Equal(factory.Time.GetUtcNow(), answer.GetProperty("publishedAt").GetDateTimeOffset());
            var stored = (await factory.FindStoryAsync(story.Id))!;
            Assert.Equal((StoryStatus.Published, (DateTimeOffset?)null), (stored.Status, stored.PublishAt));
            Assert.Equal([(staff, "story.published", "Story")], await factory.AuditOfAsync(story.Id));
        }
    }

    [Fact]
    public async Task Given_a_Scheduled_story_whose_time_has_passed_When_an_Admin_reads_it_before_any_tick_Then_every_read_shows_it_Published_at_its_time_and_nothing_is_audited()
    {
        var at = factory.Time.GetUtcNow().AddMinutes(-1);
        var story = await factory.PutStoryAsync("Past due on read", StoryStatus.Scheduled, at: at.AddHours(-2), publishAt: at);
        var (client, cookie, _) = await SignInAsync("dana.stories.pastdue.read@example.org");
        using (client)
        {
            using var one = await AdminStories.GetAsync(client, cookie, $"{AdminStories.Path}/{story.Id}");
            var answer = await AdminStories.JsonAsync(one);
            Assert.Equal("published", answer.GetProperty("status").GetString());
            Assert.Equal(at, answer.GetProperty("publishedAt").GetDateTimeOffset());

            using var preview = await AdminStories.GetAsync(client, cookie, $"{AdminStories.Path}/{story.Id}/preview");
            var seen = await AdminStories.JsonAsync(preview);
            Assert.Equal(("published", at), (seen.GetProperty("status").GetString(), seen.GetProperty("publishedAt").GetDateTimeOffset()));

            using var published = await AdminStories.GetAsync(client, cookie, $"{AdminStories.Path}?status=published");
            var tab = await AdminStories.JsonAsync(published);
            var row = tab.GetProperty("items").EnumerateArray().Single(r => r.GetProperty("id").GetGuid() == story.Id);
            Assert.Equal(("published", at), (row.GetProperty("status").GetString(), row.GetProperty("when").GetDateTimeOffset()));

            using var scheduled = await AdminStories.GetAsync(client, cookie, $"{AdminStories.Path}?status=scheduled");
            Assert.DoesNotContain(story.Id.ToString(), AdminStories.Ids(await AdminStories.JsonAsync(scheduled)));

            Assert.Equal(StoryStatus.Scheduled, (await factory.FindStoryAsync(story.Id))!.Status);
            Assert.Empty(await factory.AuditOfAsync(story.Id));
        }
    }

    [Fact]
    public async Task Given_Scheduled_stories_before_and_past_their_time_When_Stories_counts_its_tabs_Then_the_past_due_one_counts_as_Published()
    {
        var (client, cookie, _) = await SignInAsync("dana.stories.pastdue.counts@example.org");
        using (client)
        {
            using var before = await AdminStories.GetAsync(client, cookie, AdminStories.Path);
            var counted = (await AdminStories.JsonAsync(before)).GetProperty("counts");
            await factory.PutStoryAsync("Counted future", StoryStatus.Scheduled, publishAt: factory.Time.GetUtcNow().AddHours(1));
            await factory.PutStoryAsync("Counted past", StoryStatus.Scheduled, at: factory.Time.GetUtcNow().AddHours(-3), publishAt: factory.Time.GetUtcNow().AddHours(-1));

            using var after = await AdminStories.GetAsync(client, cookie, AdminStories.Path);
            var counts = (await AdminStories.JsonAsync(after)).GetProperty("counts");

            Assert.Equal(
                (counted.GetProperty("scheduled").GetInt32() + 1, counted.GetProperty("published").GetInt32() + 1),
                (counts.GetProperty("scheduled").GetInt32(), counts.GetProperty("published").GetInt32()));
        }
    }

    [Fact]
    public async Task Given_a_Scheduled_story_whose_time_has_passed_When_an_Admin_unschedules_it_Then_it_is_refused_with_status_conflict_as_it_is_Published()
    {
        var at = factory.Time.GetUtcNow().AddSeconds(-1);
        var story = await factory.PutStoryAsync("Past due unschedule", StoryStatus.Scheduled, at: at.AddHours(-2), publishAt: at);
        var (client, cookie, _) = await SignInAsync("dana.stories.pastdue.unschedule@example.org");
        using (client)
        {
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "unschedule"), cookie, new { version = story.Version });

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal("status_conflict", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
            Assert.Equal((StoryStatus.Scheduled, at), ((await factory.FindStoryAsync(story.Id))!.Status, (await factory.FindStoryAsync(story.Id))!.PublishAt!.Value));
            Assert.Empty(await factory.AuditOfAsync(story.Id));
        }
    }

    [Theory]
    [InlineData(StoryStatus.Draft)]
    [InlineData(StoryStatus.Published)]
    public async Task Given_a_story_that_is_not_Scheduled_When_an_Admin_unschedules_it_Then_it_is_refused_with_status_conflict(StoryStatus status)
    {
        var story = await factory.PutStoryAsync($"Unschedule conflict {status}", status);
        var (client, cookie, _) = await SignInAsync($"dana.stories.unschedule.conflict.{status}@example.org".ToLowerInvariant());
        using (client)
        {
            using var response = await AdminStories.SendAsync(client, HttpMethod.Post, ActionOf(story.Id, "unschedule"), cookie, new { version = story.Version });

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal(status, (await factory.FindStoryAsync(story.Id))!.Status);
        }
    }
}
