using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Sessions;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-044 AC3, AC5 and AC6: an email with no account is answered exactly as a registered one and
/// sent nothing; a malformed email is refused 400 <c>validation_failed</c>; a fourth request within
/// the hour for one account is answered the same 202 and sent nothing until the hour has passed.
/// </summary>
public sealed class PasswordResetDisclosureTests(PasswordResetRequestTests.Factory factory)
    : IClassFixture<PasswordResetRequestTests.Factory>
{
    [Fact]
    public async Task Given_an_email_no_account_has_When_a_link_is_requested_Then_the_answer_is_the_same_and_no_email_is_sent()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "grace.known@example.org");
        using var known = await PasswordResetRequestTests.RequestAsync(client, "grace.known@example.org");
        var before = factory.Emails.Sent().Count;

        using var unknown = await PasswordResetRequestTests.RequestAsync(client, "nobody.here@example.org");

        Assert.Equal(HttpStatusCode.Accepted, unknown.StatusCode);
        Assert.Equal(known.StatusCode, unknown.StatusCode);
        Assert.Equal(await known.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken), await unknown.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
        Assert.Equal(ContentHeaders(known), ContentHeaders(unknown));
        Assert.Equal(HeaderNames(known), HeaderNames(unknown));
        Assert.Equal(before, factory.Emails.Sent().Count);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("grace.thompson@gmail")]
    [InlineData("grace thompson@gmail.com")]
    [InlineData("grace.thompson.gmail.com")]
    public async Task Given_a_blank_or_malformed_email_When_a_link_is_requested_Then_it_is_refused_with_validation_failed(string email)
    {
        using var client = Browser.CreateClient(factory);
        var before = factory.Emails.Sent().Count;

        using var response = await PasswordResetRequestTests.RequestAsync(client, email);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal(["email"], problem.GetProperty("errors").EnumerateObject().Select(p => p.Name));
        Assert.Equal("Enter an email address like name@example.com", problem.GetProperty("errors").GetProperty("email")[0].GetString());
        Assert.Equal(before, factory.Emails.Sent().Count);
    }

    [Fact]
    public async Task Given_an_email_longer_than_254_characters_When_a_link_is_requested_Then_it_is_refused_with_validation_failed()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await PasswordResetRequestTests.RequestAsync(client, new string('g', 243) + "@example.org");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_body_with_no_email_When_a_link_is_requested_Then_it_is_refused_with_validation_failed()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await client.PostAsJsonAsync(new Uri("/api/account/password-reset", UriKind.Relative), new { }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_three_links_sent_within_the_hour_When_a_fourth_is_requested_Then_it_is_answered_the_same_and_sent_only_after_the_hour()
    {
        using var client = Browser.CreateClient(factory);
        var memberId = Guid.Parse(await SignInTests.JoinAsync(client, "grace.window@example.org"));
        var start = factory.Time.GetUtcNow();
        for (var i = 0; i < 3; i++)
        {
            using var sent = await PasswordResetRequestTests.RequestAsync(client, "grace.window@example.org");
            Assert.Equal(HttpStatusCode.Accepted, sent.StatusCode);
            factory.Time.Advance(TimeSpan.FromMinutes(10));
        }

        Assert.Equal(3, factory.Emails.Sent().Count(m => m.To == "grace.window@example.org"));

        // 30 minutes after the first: the window still holds three.
        using var fourth = await PasswordResetRequestTests.RequestAsync(client, "grace.window@example.org");
        Assert.Equal(HttpStatusCode.Accepted, fourth.StatusCode);
        Assert.Empty(await fourth.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
        Assert.Equal(3, factory.Emails.Sent().Count(m => m.To == "grace.window@example.org"));
        Assert.Equal(3, await CountResetsAsync(memberId));

        // Exactly an hour after the first, it has left the window.
        factory.Time.SetUtcNow(start.AddHours(1));
        using var after = await PasswordResetRequestTests.RequestAsync(client, "grace.window@example.org");
        Assert.Equal(HttpStatusCode.Accepted, after.StatusCode);
        Assert.Equal(4, factory.Emails.Sent().Count(m => m.To == "grace.window@example.org"));
    }

    private async Task<int> CountResetsAsync(Guid memberId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().PasswordResets
            .CountAsync(r => r.MemberId == memberId, TestContext.Current.CancellationToken);
    }

    private static string[] ContentHeaders(HttpResponseMessage response) =>
        [.. response.Content.Headers.Select(h => $"{h.Key}: {string.Join(",", h.Value)}").Order(StringComparer.Ordinal)];

    private static string[] HeaderNames(HttpResponseMessage response) =>
        [.. response.Headers.Select(h => h.Key).Order(StringComparer.Ordinal)];
}
