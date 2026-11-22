using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using ChristianFitness.Api.Tests.Sessions;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-044 AC2: the email of a registered member, in any case and with spaces around it, is answered
/// 202 with no body and sent one email holding a single-use link to <c>/reset-password</c> that
/// expires 30 minutes after the request; only a hash of the link's token is stored.
/// </summary>
public sealed partial class PasswordResetRequestTests(PasswordResetRequestTests.Factory factory)
    : IClassFixture<PasswordResetRequestTests.Factory>
{
    /// <summary>The API with a clock the tests move (AGENTS.md: never sleep).</summary>
    public sealed class Factory : ApiFactory
    {
        public FakeTimeProvider Time { get; } = new(new DateTimeOffset(2026, 4, 15, 12, 45, 0, TimeSpan.Zero));

        protected override void ConfigureServices(IServiceCollection services)
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Time);
        }
    }

    internal static Task<HttpResponseMessage> RequestAsync(HttpClient client, string email) =>
        client.PostAsJsonAsync(new Uri("/api/account/password-reset", UriKind.Relative), new { email }, TestContext.Current.CancellationToken);

    [Fact]
    public async Task Given_a_registered_member_When_they_request_a_reset_link_Then_it_is_accepted_and_one_email_holds_the_link()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "grace.reset@example.org");
        var before = factory.Emails.Sent().Count;

        using var response = await RequestAsync(client, "grace.reset@example.org");

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
        var email = Assert.Single(factory.Emails.Sent().Skip(before));
        Assert.Equal("grace.reset@example.org", email.To);
        Assert.Equal("Reset your Christian Fitness password", email.Subject);
        Assert.StartsWith("Hi Grace,", email.Text, StringComparison.Ordinal);
        Assert.Contains("The link expires in 30 minutes", email.Text, StringComparison.Ordinal);
        Assert.Matches(LinkPattern(), email.Text);
    }

    [Fact]
    public async Task Given_a_reset_link_was_sent_When_it_is_stored_Then_only_the_hash_of_its_token_is_kept_with_a_30_minute_expiry()
    {
        using var client = Browser.CreateClient(factory);
        var memberId = await SignInTests.JoinAsync(client, "grace.reset.hash@example.org");
        var before = factory.Emails.Sent().Count;

        using var response = await RequestAsync(client, "grace.reset.hash@example.org");

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var token = TokenOf(Assert.Single(factory.Emails.Sent().Skip(before)).Text);
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var reset = await db.PasswordResets.SingleAsync(r => r.MemberId == Guid.Parse(memberId), TestContext.Current.CancellationToken);
        Assert.Equal(Convert.ToHexStringLower(SHA256.HashData(Encoding.ASCII.GetBytes(token))), reset.TokenHash);
        Assert.Equal(factory.Time.GetUtcNow(), reset.RequestedAt);
        Assert.Equal(factory.Time.GetUtcNow().AddMinutes(30), reset.ExpiresAt);
        Assert.DoesNotContain(token, reset.TokenHash, StringComparison.Ordinal);
    }

    // The email is the account's lookup key: trimmed and compared case-insensitively, as at Join.
    [Theory]
    [InlineData("Grace.Reset.Case@Example.ORG")]
    [InlineData("  grace.reset.case@example.org ")]
    public async Task Given_the_email_in_another_case_or_with_spaces_When_a_link_is_requested_Then_it_goes_to_the_account_address(string given)
    {
        using var client = Browser.CreateClient(factory);
        await JoinOnceAsync(client, "grace.reset.case@example.org");
        var before = factory.Emails.Sent().Count;

        using var response = await RequestAsync(client, given);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Equal("grace.reset.case@example.org", Assert.Single(factory.Emails.Sent().Skip(before)).To);
    }

    [Fact]
    public async Task Given_two_requests_When_both_are_sent_Then_each_link_holds_a_different_token()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "grace.reset.twice@example.org");
        var before = factory.Emails.Sent().Count;

        using var first = await RequestAsync(client, "grace.reset.twice@example.org");
        using var second = await RequestAsync(client, "grace.reset.twice@example.org");

        var tokens = factory.Emails.Sent().Skip(before).Select(m => TokenOf(m.Text)).ToArray();
        Assert.Equal(2, tokens.Length);
        Assert.NotEqual(tokens[0], tokens[1]);
    }

    internal static string TokenOf(string text) => LinkPattern().Match(text).Groups["token"].Value;

    private static readonly SemaphoreSlim Joining = new(1, 1);
    private static bool _joined;

    private static async Task JoinOnceAsync(HttpClient client, string email)
    {
        await Joining.WaitAsync(TestContext.Current.CancellationToken);
        try
        {
            if (!_joined)
            {
                await SignInTests.JoinAsync(client, email);
                _joined = true;
            }
        }
        finally
        {
            Joining.Release();
        }
    }

    /// <summary>The link: the member app's address, <c>/reset-password</c>, and 32 random bytes in base64url in the fragment.</summary>
    [GeneratedRegex(@"https://members\.example\.test/reset-password#token=(?<token>[A-Za-z0-9_-]{43})(\s|$)")]
    internal static partial Regex LinkPattern();
}
