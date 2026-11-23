using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Sessions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-045 AC1 and AC2: the screen checks the emailed link, which answers the account's email; a
/// usable link sets a password of at least 8 characters, answered 204 with no body, after which the
/// new password signs in and the old one no longer does.
/// </summary>
public sealed class PasswordResetCompleteTests(PasswordResetCompleteTests.Factory factory)
    : IClassFixture<PasswordResetCompleteTests.Factory>
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

    internal const string OldPassword = "abundantlife";
    internal const string NewPassword = "graceandgrit";

    [Fact]
    public async Task Given_a_usable_link_When_it_is_checked_Then_it_answers_the_account_email_only()
    {
        using var client = Browser.CreateClient(factory);
        var token = await LinkForAsync(factory, client, "grace.complete.check@example.org");

        using var response = await CheckAsync(client, token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["email"], body.EnumerateObject().Select(p => p.Name));
        Assert.Equal("grace.complete.check@example.org", body.GetProperty("email").GetString());
    }

    [Fact]
    public async Task Given_a_usable_link_When_a_new_password_is_saved_Then_it_answers_204_with_no_body()
    {
        using var client = Browser.CreateClient(factory);
        var token = await LinkForAsync(factory, client, "grace.complete.saved@example.org");

        using var response = await CompleteAsync(client, token, NewPassword);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
        Assert.Null(Browser.SessionSetCookie(response));
    }

    [Fact]
    public async Task Given_a_new_password_was_saved_When_the_member_signs_in_Then_the_new_password_works_and_the_old_one_does_not()
    {
        using var client = Browser.CreateClient(factory);
        var token = await LinkForAsync(factory, client, "grace.complete.signin@example.org");
        using (var saved = await CompleteAsync(client, token, NewPassword))
        {
            Assert.Equal(HttpStatusCode.NoContent, saved.StatusCode);
        }

        using var withOld = await Browser.SignInAsync(client, "grace.complete.signin@example.org", OldPassword);
        using var withNew = await Browser.SignInAsync(client, "grace.complete.signin@example.org", NewPassword);

        Assert.Equal(HttpStatusCode.Unauthorized, withOld.StatusCode);
        Assert.Equal(HttpStatusCode.OK, withNew.StatusCode);
    }

    // L2-045 AC3: every session of the member ends on the server; other members stay signed in.
    [Fact]
    public async Task Given_a_member_signed_in_on_two_devices_When_a_new_password_is_saved_Then_both_sessions_end_and_another_member_stays_signed_in()
    {
        using var client = Browser.CreateClient(factory);
        var token = await LinkForAsync(factory, client, "grace.complete.sessions@example.org");
        using var phone = await Browser.SignInAsync(client, "grace.complete.sessions@example.org", OldPassword);
        using var laptop = await Browser.SignInAsync(client, "grace.complete.sessions@example.org", OldPassword);
        await SignInTests.JoinAsync(client, "michael.complete.sessions@example.org");
        using var other = await Browser.SignInAsync(client, "michael.complete.sessions@example.org", OldPassword);
        foreach (var signedIn in new[] { phone, laptop, other })
        {
            using var before = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", Browser.SessionCookie(signedIn));
            Assert.Equal(HttpStatusCode.OK, before.StatusCode);
        }

        using (var saved = await CompleteAsync(client, token, NewPassword))
        {
            Assert.Equal(HttpStatusCode.NoContent, saved.StatusCode);
        }

        using var phoneAfter = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", Browser.SessionCookie(phone));
        using var laptopAfter = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", Browser.SessionCookie(laptop));
        using var otherAfter = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", Browser.SessionCookie(other));
        Assert.Equal(HttpStatusCode.Unauthorized, phoneAfter.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, laptopAfter.StatusCode);
        Assert.Equal(HttpStatusCode.OK, otherAfter.StatusCode);
    }

    // L2-045 AC3: saving from a browser signed in as the member signs nobody in, that browser included.
    [Fact]
    public async Task Given_the_member_saves_from_a_signed_in_browser_When_the_password_is_saved_Then_that_session_ends_too()
    {
        using var client = Browser.CreateClient(factory);
        var token = await LinkForAsync(factory, client, "grace.complete.here@example.org");
        using var signedIn = await Browser.SignInAsync(client, "grace.complete.here@example.org", OldPassword);
        var cookie = Browser.SessionCookie(signedIn);
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri("/api/account/password-reset/complete", UriKind.Relative))
        {
            Content = JsonContent.Create(new { token, password = NewPassword }),
        };
        request.Headers.Add("Cookie", cookie);

        using (var saved = await client.SendAsync(request, TestContext.Current.CancellationToken))
        {
            Assert.Equal(HttpStatusCode.NoContent, saved.StatusCode);
            Assert.Null(Browser.SessionSetCookie(saved));
        }

        using var after = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", cookie);
        Assert.Equal(HttpStatusCode.Unauthorized, after.StatusCode);
    }

    /// <summary>Joins as <paramref name="email"/> (password <see cref="OldPassword"/>) and answers the token of a reset link sent to it.</summary>
    internal static async Task<string> LinkForAsync(ApiFactory factory, HttpClient client, string email)
    {
        await SignInTests.JoinAsync(client, email);
        return await NewLinkAsync(factory, client, email);
    }

    /// <summary>Asks for one more reset link for <paramref name="email"/> and answers its token.</summary>
    internal static async Task<string> NewLinkAsync(ApiFactory factory, HttpClient client, string email)
    {
        var before = factory.Emails.Sent().Count;
        using var requested = await PasswordResetRequestTests.RequestAsync(client, email);
        Assert.Equal(HttpStatusCode.Accepted, requested.StatusCode);
        return PasswordResetRequestTests.TokenOf(factory.Emails.Sent().Skip(before).Single(m => m.To == email).Text);
    }

    internal static Task<HttpResponseMessage> CheckAsync(HttpClient client, string? token) =>
        client.PostAsJsonAsync(new Uri("/api/account/password-reset/check", UriKind.Relative), new { token }, TestContext.Current.CancellationToken);

    internal static Task<HttpResponseMessage> CompleteAsync(HttpClient client, string? token, string? password) =>
        client.PostAsJsonAsync(new Uri("/api/account/password-reset/complete", UriKind.Relative), new { token, password }, TestContext.Current.CancellationToken);
}
