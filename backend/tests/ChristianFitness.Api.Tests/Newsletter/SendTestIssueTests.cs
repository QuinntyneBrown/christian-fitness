using System.Net;
using ChristianFitness.Domain.News;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Newsletter;

/// <summary>
/// L2-070 AC9 (journey 28, slice 6): "Send me a test" sends the issue as it stands, saved or not,
/// only to the signed-in Admin's own address, answers that address, issues no Unsubscribe token
/// and leaves the issue as it was.
/// </summary>
public sealed class SendTestIssueTests(SendIssueFactory factory) : IClassFixture<SendIssueFactory>
{
    [Fact]
    public async Task Given_an_issue_as_it_stands_When_an_Admin_sends_a_test_Then_only_their_own_address_receives_it()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Desk.SignInAsync(factory, client, "dana.test.send@example.org");
        await factory.AddSubscriberAsync("reader.test.send@example.org");
        var lead = await factory.PutStoryAsync("Test lead story", StoryStatus.Published, slug: "test-lead-story");
        var number = (await Desk.ReadAsync(client, cookie)).GetProperty("nextIssue").GetProperty("number").GetInt32();
        var before = factory.Emails.Sent().Count;
        var tokensBefore = await TokensAsync();

        // Half-written: no editor's note yet, and nothing saved.
        using var response = await Desk.PostAsync(client, cookie, number, "test", Desk.Fields(lead.Id, subject: "Unsaved test subject", note: string.Empty));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await Desk.JsonAsync(response);
        Assert.Equal(["sentTo"], answer.EnumerateObject().Select(p => p.Name));
        Assert.Equal("dana.test.send@example.org", answer.GetProperty("sentTo").GetString());
        var email = Assert.Single(factory.Emails.Sent().Skip(before));
        Assert.Equal(("dana.test.send@example.org", "Unsaved test subject"), (email.To, email.Subject));
        Assert.StartsWith("Hi Grace,", email.Text, StringComparison.Ordinal);
        Assert.Contains("Test lead story\nhttps://members.example.test/stories/test-lead-story", email.Text, StringComparison.Ordinal);
        Assert.Empty(email.Headers);
        Assert.DoesNotContain("unsubscribe=", email.Text, StringComparison.Ordinal);
        Assert.Equal(tokensBefore, await TokensAsync());
        var issue = (await Desk.ReadAsync(client, cookie)).GetProperty("nextIssue");
        Assert.Equal(("draft", string.Empty), (issue.GetProperty("status").GetString(), issue.GetProperty("subject").GetString()));
    }

    private async Task<int> TokensAsync()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().NewsletterUnsubscribeTokens.CountAsync(TestContext.Current.CancellationToken);
    }
}
