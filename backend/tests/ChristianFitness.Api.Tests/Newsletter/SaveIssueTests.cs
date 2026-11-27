using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Newsletter;

/// <summary>Requests the desk's tests share: staff signed in, the desk read, and an issue saved.</summary>
internal static class Desk
{
    public const string Path = "/api/admin/newsletter";

    public static async Task<string> SignInAsync(ApiFactory factory, HttpClient client, string email, StaffRoleName role = StaffRoleName.Admin)
    {
        await Staff.CreateAsync(factory, client, email, role);
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, client, email);
        return Staff.Cookie(signedIn);
    }

    /// <summary>Signs existing staff in again: a staff session ends 30 minutes after its last request, and the tests move the clock by days.</summary>
    public static async Task<string> SignInAgainAsync(ApiFactory factory, HttpClient client, string email)
    {
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, client, email);
        return Staff.Cookie(signedIn);
    }

    public static async Task<JsonElement> ReadAsync(HttpClient client, string cookie)
    {
        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, Path, cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await JsonAsync(response);
    }

    public static Task<HttpResponseMessage> SaveAsync(HttpClient client, string cookie, int number, object fields) =>
        AdminEvents.SendAsync(client, HttpMethod.Put, $"{Path}/issues/{number}", cookie, fields);

    public static Task<HttpResponseMessage> PostAsync(HttpClient client, string cookie, int number, string action, object? fields = null) =>
        AdminEvents.SendAsync(client, HttpMethod.Post, $"{Path}/issues/{number}/{action}", cookie, fields);

    public static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken).ConfigureAwait(false);

    /// <summary>A complete issue's fields, leading with <paramref name="lead"/>.</summary>
    public static Dictionary<string, object?> Fields(Guid? lead, Guid[]? also = null, Guid[]? events = null, string subject = "Advent starts on the trail", string note = "Friends, the first candle is lit.") =>
        new(StringComparer.Ordinal)
        {
            ["subject"] = subject,
            ["editorsNote"] = note,
            ["leadStoryId"] = lead,
            ["alsoStoryIds"] = also ?? [],
            ["eventIds"] = events ?? [],
            ["verse"] = "Whether you eat or drink, do it all for the glory of God.",
            ["verseReference"] = "1 Corinthians 10:31",
        };
}

/// <summary>
/// L2-070 AC2 and AC14 (journey 28, slice 3): a Draft issue's fields are saved and the desk shows
/// them again; more than three "Also this week" stories or a field over its limit saves nothing and
/// names the field; an issue that does not exist is not found.
/// </summary>
public sealed class SaveIssueTests(NewsletterCandidatesFactory factory) : IClassFixture<NewsletterCandidatesFactory>
{
    private static readonly string[] IssueKeys = ["number", "status", "sendAt", "subject", "editorsNote", "leadStoryId", "alsoStoryIds", "eventIds", "verse", "verseReference", "missedSend"];

    [Fact]
    public async Task Given_a_Draft_issue_When_its_fields_are_saved_Then_the_desk_shows_them_and_the_answer_says_when()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Desk.SignInAsync(factory, client, "dana.save@example.org");
        var lead = await factory.PutStoryAsync("Save lead", StoryStatus.Published);
        var also = await factory.PutStoryAsync("Save also", StoryStatus.Published);
        var featured = await factory.AddEventAsync("Save event", TimeSpan.FromDays(2));
        var number = (await Desk.ReadAsync(client, cookie)).GetProperty("nextIssue").GetProperty("number").GetInt32();

        using var response = await Desk.SaveAsync(client, cookie, number, Desk.Fields(lead.Id, [also.Id], [featured], subject: "  Advent starts on the trail  "));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = await Desk.JsonAsync(response);
        Assert.Equal(["savedAt"], saved.EnumerateObject().Select(p => p.Name));
        Assert.Equal(factory.Time.GetUtcNow(), saved.GetProperty("savedAt").GetDateTimeOffset());
        var issue = (await Desk.ReadAsync(client, cookie)).GetProperty("nextIssue");
        Assert.Equal(IssueKeys, issue.EnumerateObject().Select(p => p.Name));
        Assert.Equal("draft", issue.GetProperty("status").GetString());
        Assert.Equal("Advent starts on the trail", issue.GetProperty("subject").GetString());
        Assert.Equal("Friends, the first candle is lit.", issue.GetProperty("editorsNote").GetString());
        Assert.Equal(lead.Id, issue.GetProperty("leadStoryId").GetGuid());
        Assert.Equal([also.Id], issue.GetProperty("alsoStoryIds").EnumerateArray().Select(i => i.GetGuid()));
        Assert.Equal([featured], issue.GetProperty("eventIds").EnumerateArray().Select(i => i.GetGuid()));
        Assert.Equal("Whether you eat or drink, do it all for the glory of God.", issue.GetProperty("verse").GetString());
        Assert.Equal("1 Corinthians 10:31", issue.GetProperty("verseReference").GetString());
    }

    [Fact]
    public async Task Given_four_more_stories_or_a_subject_too_long_When_the_issue_is_saved_Then_nothing_is_saved_and_the_field_is_named()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Desk.SignInAsync(factory, client, "dana.save.invalid@example.org");
        var number = (await Desk.ReadAsync(client, cookie)).GetProperty("nextIssue").GetProperty("number").GetInt32();
        using var kept = await Desk.SaveAsync(client, cookie, number, Desk.Fields(null, subject: "Kept subject"));
        Assert.Equal(HttpStatusCode.OK, kept.StatusCode);
        Guid[] four = [Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid()];

        using var response = await Desk.SaveAsync(client, cookie, number, Desk.Fields(null, four, subject: new string('s', 151)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await Desk.JsonAsync(response);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal("too_many_stories", problem.GetProperty("fieldCodes").GetProperty("alsoStoryIds").GetString());
        Assert.Equal("subject_too_long", problem.GetProperty("fieldCodes").GetProperty("subject").GetString());
        Assert.Equal("Kept subject", (await Desk.ReadAsync(client, cookie)).GetProperty("nextIssue").GetProperty("subject").GetString());
    }

    [Fact]
    public async Task Given_no_such_issue_When_it_is_saved_Then_it_is_not_found()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Desk.SignInAsync(factory, client, "dana.save.missing@example.org");

        using var response = await Desk.SaveAsync(client, cookie, 9999, Desk.Fields(null));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("issue_not_found", (await Desk.JsonAsync(response)).GetProperty("code").GetString());
    }
}
