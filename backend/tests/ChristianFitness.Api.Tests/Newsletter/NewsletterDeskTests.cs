using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Api.Tests.Newsletter;

/// <summary>
/// L2-070 AC1 and AC12 (journey 28, slice 1): an Admin opens the Newsletter desk and reads the
/// newsletter's name, how many subscribers are confirmed, when it goes out, and the next issue with
/// its number and status; a Moderator opens it as an Admin does. The class's clock starts on
/// Thursday 26 November 2026 at 9 AM in Toronto, so the next send is Saturday 28 November, 7 AM.
/// </summary>
public sealed class NewsletterDeskTests(NewsletterFactory factory) : IClassFixture<NewsletterFactory>
{
    private const string Path = "/api/admin/newsletter";

    [Fact]
    public async Task Given_confirmed_and_unconfirmed_subscribers_When_an_Admin_opens_the_desk_Then_it_shows_the_name_the_confirmed_count_the_send_time_and_a_Draft_issue()
    {
        using var visitor = Newsletter.ClientFrom(factory, "198.51.100.40");
        var before = (await DeskAsync("dana.desk.before@example.org")).GetProperty("confirmedSubscribers").GetInt32();
        await ConfirmedAsync(visitor, "desk.one@example.org");
        await ConfirmedAsync(visitor, "desk.two@example.org");
        using var pending = await Newsletter.SubscribeAsync(visitor, "desk.pending@example.org");
        Assert.Equal(HttpStatusCode.Accepted, pending.StatusCode);

        var desk = await DeskAsync("dana.desk@example.org");

        Assert.Equal(["name", "confirmedSubscribers", "sendsAt", "nextIssue", "stories", "events"], desk.EnumerateObject().Select(p => p.Name));
        Assert.Equal("The Abundant Weekly", desk.GetProperty("name").GetString());
        Assert.Equal(before + 2, desk.GetProperty("confirmedSubscribers").GetInt32());
        Assert.Equal(new DateTimeOffset(2026, 11, 28, 12, 0, 0, TimeSpan.Zero), desk.GetProperty("sendsAt").GetDateTimeOffset());
        var issue = desk.GetProperty("nextIssue");
        Assert.Equal(1, issue.GetProperty("number").GetInt32());
        Assert.Equal("draft", issue.GetProperty("status").GetString());
        Assert.Equal(desk.GetProperty("sendsAt").GetDateTimeOffset(), issue.GetProperty("sendAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_open_the_desk_Then_it_answers_as_it_does_for_an_Admin()
    {
        var admin = await DeskAsync("dana.desk.same@example.org");

        var moderator = await DeskAsync("joel.desk@example.org", StaffRoleName.Moderator);

        Assert.Equal(admin.GetProperty("name").GetString(), moderator.GetProperty("name").GetString());
        Assert.Equal(admin.GetProperty("nextIssue").GetProperty("number").GetInt32(), moderator.GetProperty("nextIssue").GetProperty("number").GetInt32());
    }

    private async Task<JsonElement> DeskAsync(string email, StaffRoleName role = StaffRoleName.Admin)
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, email, role);
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, client, email);
        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, Path, Staff.Cookie(signedIn));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private async Task ConfirmedAsync(HttpClient client, string email)
    {
        var sent = factory.Emails.Sent().Count;
        using var subscribed = await Newsletter.SubscribeAsync(client, email);
        Assert.Equal(HttpStatusCode.Accepted, subscribed.StatusCode);
        var token = Newsletter.ConfirmTokenOf(Assert.Single(Newsletter.SentTo(factory, email, sent)));
        using var confirmed = await Newsletter.ConfirmAsync(client, token);
        Assert.Equal(HttpStatusCode.OK, confirmed.StatusCode);
    }
}
