using System.Net;
using System.Text.Json;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Newsletter;
using ChristianFitness.Domain.News;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Newsletter;

/// <summary>
/// L2-070 AC5, AC6 and AC13 (journey 28, slice 4): a complete issue is Scheduled, locked and
/// audited; "Unschedule to edit" makes it a Draft again; an empty subject, no big story or an empty
/// editor's note schedules nothing and names each field; a story or event no longer published is
/// refused the same way. The tests share one next issue, so each leaves it a Draft.
/// </summary>
public sealed class ScheduleIssueTests(NewsletterCandidatesFactory factory) : IClassFixture<NewsletterCandidatesFactory>
{
    [Fact]
    public async Task Given_a_complete_issue_When_it_is_scheduled_Then_it_is_Scheduled_locked_and_audited_and_unscheduling_makes_it_a_Draft_again()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Desk.SignInAsync(factory, client, "dana.schedule@example.org");
        var lead = await factory.PutStoryAsync("Schedule lead", StoryStatus.Published);
        var number = await NumberAsync(client, cookie);

        using var scheduled = await Desk.PostAsync(client, cookie, number, "schedule", Desk.Fields(lead.Id, subject: "Scheduled subject"));

        Assert.Equal(HttpStatusCode.OK, scheduled.StatusCode);
        var issue = await Desk.JsonAsync(scheduled);
        Assert.Equal(("scheduled", "Scheduled subject"), (issue.GetProperty("status").GetString(), issue.GetProperty("subject").GetString()));
        Assert.Equal("scheduled", (await Desk.ReadAsync(client, cookie)).GetProperty("nextIssue").GetProperty("status").GetString());
        using var edit = await Desk.SaveAsync(client, cookie, number, Desk.Fields(lead.Id, subject: "Changed while locked"));
        Assert.Equal(HttpStatusCode.Conflict, edit.StatusCode);
        Assert.Equal("status_conflict", (await Desk.JsonAsync(edit)).GetProperty("code").GetString());

        using var unscheduled = await Desk.PostAsync(client, cookie, number, "unschedule");

        Assert.Equal(HttpStatusCode.OK, unscheduled.StatusCode);
        var draft = await Desk.JsonAsync(unscheduled);
        Assert.Equal(("draft", "Scheduled subject"), (draft.GetProperty("status").GetString(), draft.GetProperty("subject").GetString()));
        using var again = await Desk.PostAsync(client, cookie, number, "unschedule");
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var admin = await db.Members.Where(m => m.Email == "dana.schedule@example.org").Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var stored = await db.NewsletterIssues.AsNoTracking().SingleAsync(i => i.Number == number, TestContext.Current.CancellationToken);
        var entries = await db.AuditEntries.AsNoTracking().Where(e => e.ActorMemberId == admin && e.RecordType == nameof(NewsletterIssue)).OrderBy(e => e.Action).ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(
            [("newsletter_issue.scheduled", nameof(NewsletterIssue), stored.Id), ("newsletter_issue.unscheduled", nameof(NewsletterIssue), stored.Id)],
            entries.Select(e => (e.Action, e.RecordType, e.RecordId)));
    }

    [Fact]
    public async Task Given_an_issue_with_nothing_written_When_it_is_scheduled_Then_nothing_is_scheduled_and_each_field_is_named()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Desk.SignInAsync(factory, client, "dana.schedule.empty@example.org");
        var number = await NumberAsync(client, cookie);

        using var response = await Desk.PostAsync(client, cookie, number, "schedule", Desk.Fields(null, subject: "  ", note: string.Empty));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await Desk.JsonAsync(response);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        var codes = problem.GetProperty("fieldCodes");
        Assert.Equal(
            [("editorsNote", "editors_note_required"), ("leadStoryId", "lead_story_required"), ("subject", "subject_required")],
            codes.EnumerateObject().Select(p => (p.Name, p.Value.GetString()!)).Order());
        Assert.Equal("draft", (await Desk.ReadAsync(client, cookie)).GetProperty("nextIssue").GetProperty("status").GetString());
    }

    [Theory]
    [InlineData("lead", "leadStoryId", "story_unavailable")]
    [InlineData("also", "alsoStoryIds", "story_unavailable")]
    [InlineData("event", "eventIds", "event_unavailable")]
    public async Task Given_a_story_or_event_not_published_When_the_issue_is_scheduled_Then_it_is_refused_naming_the_field(string which, string field, string code)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Desk.SignInAsync(factory, client, $"dana.schedule.{which}@example.org");
        var published = await factory.PutStoryAsync($"Unavailable {which} published", StoryStatus.Published);
        var draft = await factory.PutStoryAsync($"Unavailable {which} draft", StoryStatus.Draft);
        var hidden = await factory.AddEventAsync($"Unavailable {which}", TimeSpan.FromDays(2), EventStatus.Draft);
        var number = await NumberAsync(client, cookie);
        var fields = which switch
        {
            "lead" => Desk.Fields(draft.Id),
            "also" => Desk.Fields(published.Id, [draft.Id]),
            _ => Desk.Fields(published.Id, events: [hidden]),
        };

        using var response = await Desk.PostAsync(client, cookie, number, "schedule", fields);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await Desk.JsonAsync(response);
        Assert.Equal(code, problem.GetProperty("fieldCodes").GetProperty(field).GetString());
        Assert.Equal("draft", (await Desk.ReadAsync(client, cookie)).GetProperty("nextIssue").GetProperty("status").GetString());
    }

    private static async Task<int> NumberAsync(HttpClient client, string cookie) =>
        (await Desk.ReadAsync(client, cookie)).GetProperty("nextIssue").GetProperty("number").GetInt32();
}
