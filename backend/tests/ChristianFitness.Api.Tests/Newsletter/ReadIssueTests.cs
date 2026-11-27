using System.Net;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.News;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Newsletter;

/// <summary>
/// L2-059 AC1, AC4 and AC7 (journey 29, slice 1): anyone reads the latest sent issue, or one by its
/// number, as it stood when sending started: the note, the big story, three more stories, the next
/// four published events of that moment whatever the featured toggles, and the verse. Nothing sent,
/// an unknown number or an issue not yet sent is 404 <c>not_found</c>; a story unpublished since is
/// hidden. The Admin's preview answers the same shape for the issue as saved (L2-070 AC9).
/// </summary>
public sealed class ReadIssueTests(SendIssueFactory factory) : IClassFixture<SendIssueFactory>
{
    private const string PublicPath = "/api/public/newsletter/issues";

    [Fact]
    public async Task Given_an_issue_is_sent_When_anyone_reads_it_Then_it_reads_as_it_stood_at_sending_and_hides_a_story_since_unpublished()
    {
        using var client = Browser.CreateClient(factory);
        using var reader = Browser.CreateClient(factory);
        var cookie = await Desk.SignInAsync(factory, client, "dana.read@example.org");
        using var none = await GetAsync(reader, "/latest");
        Assert.Equal(HttpStatusCode.NotFound, none.StatusCode);
        Assert.Equal("not_found", (await Desk.JsonAsync(none)).GetProperty("code").GetString());
        var lead = await factory.PutStoryAsync("Read lead story", StoryStatus.Published, slug: "read-lead-story", section: StorySection.Training, content: c => c with { Summary = "The lead's summary." });
        var brief = await factory.PutStoryAsync("Read brief one", StoryStatus.Published, slug: "read-brief-one");
        var gone = await factory.PutStoryAsync("Read brief gone", StoryStatus.Published, slug: "read-brief-gone");
        var events = new List<Guid>();
        for (var day = 9; day <= 13; day++)
        {
            events.Add(await factory.AddEventAsync($"Read event {day}", TimeSpan.FromDays(day)));
        }

        var desk = await Desk.ReadAsync(client, cookie);
        var number = desk.GetProperty("nextIssue").GetProperty("number").GetInt32();
        var sendAt = desk.GetProperty("nextIssue").GetProperty("sendAt").GetDateTimeOffset();
        // Only the fifth event is featured: the calendar lists the next four all the same (AC1).
        using var saved = await Desk.SaveAsync(client, cookie, number, Desk.Fields(lead.Id, [brief.Id, gone.Id], [events[4]], subject: "Read subject"));
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);

        using var preview = await AdminEvents.SendAsync(client, HttpMethod.Get, $"{Desk.Path}/issues/{number}/preview", cookie);
        Assert.Equal(HttpStatusCode.OK, preview.StatusCode);
        var previewed = await Desk.JsonAsync(preview);
        using var notSent = await GetAsync(reader, $"/{number}");
        Assert.Equal(HttpStatusCode.NotFound, notSent.StatusCode);

        using var scheduled = await Desk.PostAsync(client, cookie, number, "schedule", Desk.Fields(lead.Id, [brief.Id, gone.Id], [events[4]], subject: "Read subject"));
        Assert.Equal(HttpStatusCode.OK, scheduled.StatusCode);
        factory.Time.SetUtcNow(sendAt);
        Assert.True((await factory.TickAsync()).Sent);
        // After sending: a sooner event appears and a brief is unpublished.
        await factory.AddEventAsync("Read event too late", TimeSpan.FromDays(1));
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            (await db.Stories.SingleAsync(s => s.Id == gone.Id, TestContext.Current.CancellationToken)).Unpublish(factory.Time.GetUtcNow());
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        using var latest = await GetAsync(reader, "/latest");
        using var byNumber = await GetAsync(reader, $"/{number}");
        using var unknown = await GetAsync(reader, "/9999");

        Assert.Equal(HttpStatusCode.OK, latest.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        var issue = await Desk.JsonAsync(latest);
        Assert.Equal(issue.GetRawText(), (await Desk.JsonAsync(byNumber)).GetRawText());
        Assert.Equal(["number", "date", "name", "editorsNote", "lead", "briefs", "events", "verse", "verseReference"], issue.EnumerateObject().Select(p => p.Name));
        Assert.Equal(previewed.EnumerateObject().Select(p => p.Name), issue.EnumerateObject().Select(p => p.Name));
        Assert.Equal(
            (number, sendAt, "The Abundant Weekly", "Friends, the first candle is lit.", "1 Corinthians 10:31"),
            (issue.GetProperty("number").GetInt32(), issue.GetProperty("date").GetDateTimeOffset(), issue.GetProperty("name").GetString(), issue.GetProperty("editorsNote").GetString(), issue.GetProperty("verseReference").GetString()));
        var big = issue.GetProperty("lead");
        Assert.Equal(["slug", "section", "headline", "summary", "author", "image"], big.EnumerateObject().Select(p => p.Name));
        Assert.Equal(("read-lead-story", "training", "Read lead story", "The lead's summary."), (big.GetProperty("slug").GetString(), big.GetProperty("section").GetString(), big.GetProperty("headline").GetString(), big.GetProperty("summary").GetString()));
        Assert.Equal(["read-brief-one"], issue.GetProperty("briefs").EnumerateArray().Select(b => b.GetProperty("slug").GetString()));
        var calendar = issue.GetProperty("events").EnumerateArray().ToArray();
        Assert.Equal(["id", "title", "startsAt", "area", "priceCents"], calendar[0].EnumerateObject().Select(p => p.Name));
        Assert.Equal(events.Take(4), calendar.Select(e => e.GetProperty("id").GetGuid()));
        // The preview read both briefs, then still published, and the same calendar.
        Assert.Equal(["read-brief-one", "read-brief-gone"], previewed.GetProperty("briefs").EnumerateArray().Select(b => b.GetProperty("slug").GetString()));
        Assert.Equal(events.Take(4), previewed.GetProperty("events").EnumerateArray().Select(e => e.GetProperty("id").GetGuid()));
    }

    private static Task<HttpResponseMessage> GetAsync(HttpClient client, string path) =>
        AdminEvents.SendAsync(client, HttpMethod.Get, PublicPath + path, cookie: null);
}
