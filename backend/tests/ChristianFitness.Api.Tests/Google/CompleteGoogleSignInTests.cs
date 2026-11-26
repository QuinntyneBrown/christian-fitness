using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Sessions;

namespace ChristianFitness.Api.Tests.Google;

/// <summary>
/// L2-049 AC3, AC4, AC11, L2-004 AC8 and AC10: the Sign in screen finishes a Google sign-in with
/// <c>POST /api/session/google</c>. The member account is matched on the Google subject first,
/// then on the email (any case), which links it; the member is signed in with the session cookie
/// and keeps their password. An unverified or missing identity, no account, or a suspended
/// account is refused with its code, and nobody is signed in.
/// </summary>
public sealed class CompleteGoogleSignInTests(ProtectionsApiFactory factory) : IClassFixture<ProtectionsApiFactory>
{
    private const string Password = "abundantlife";
    private const string CompletePath = "/api/session/google";

    [Fact]
    public async Task Given_a_member_who_joined_with_email_When_they_finish_Google_sign_in_with_that_email_in_another_case_Then_they_are_signed_in_and_the_identity_is_forgotten()
    {
        using var client = Browser.CreateClient(factory);
        var memberId = await SignInTests.JoinAsync(client, "grace.google.match@example.org");
        var external = await GoogleSignIn.ExternalCookieAsync(client, factory.Google, GoogleApp.Member, new GoogleAccount { Email = "Grace.Google.Match@Example.org" });

        using var response = await CompleteAsync(client, external);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var session = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["memberId", "name"], session.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(memberId, session.GetProperty("memberId").GetString());
        var attributes = Browser.Attributes(Assert.IsType<string>(Browser.SessionSetCookie(response)));
        Assert.Contains("httponly", attributes);
        Assert.Contains("samesite=lax", attributes);
        using var me = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", Browser.SessionCookie(response));
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        // The identity is deleted at once: it cannot sign anyone in again.
        Assert.Contains("expires=thu, 01 jan 1970 00:00:00 gmt", Browser.Attributes(Assert.IsType<string>(Browser.SetCookie(response, GoogleSignIn.ExternalCookieName))));
    }

    [Fact]
    public async Task Given_a_member_linked_by_email_When_they_sign_in_with_their_password_Then_it_still_works()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "grace.google.keeps@example.org");
        var external = await GoogleSignIn.ExternalCookieAsync(client, factory.Google, GoogleApp.Member, new GoogleAccount { Email = "grace.google.keeps@example.org" });
        using var withGoogle = await CompleteAsync(client, external);
        Assert.Equal(HttpStatusCode.OK, withGoogle.StatusCode);

        using var withPassword = await Browser.SignInAsync(client, "grace.google.keeps@example.org", Password);

        Assert.Equal(HttpStatusCode.OK, withPassword.StatusCode);
    }

    [Fact]
    public async Task Given_a_member_linked_to_a_Google_account_When_that_account_comes_back_with_another_email_Then_the_subject_wins()
    {
        using var client = Browser.CreateClient(factory);
        var graceId = await SignInTests.JoinAsync(client, "grace.google.subject@example.org");
        await SignInTests.JoinAsync(client, "michael.google.subject@example.org");
        var google = new GoogleAccount { Email = "grace.google.subject@example.org" };
        using (var linked = await CompleteAsync(client, await GoogleSignIn.ExternalCookieAsync(client, factory.Google, GoogleApp.Member, google)))
        {
            Assert.Equal(HttpStatusCode.OK, linked.StatusCode);
        }

        // The same Google account now reports Michael's email: the stored subject still names Grace.
        var renamed = new GoogleAccount { Subject = google.Subject, Email = "michael.google.subject@example.org" };
        using var response = await CompleteAsync(client, await GoogleSignIn.ExternalCookieAsync(client, factory.Google, GoogleApp.Member, renamed));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var session = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(graceId, session.GetProperty("memberId").GetString());
    }

    [Fact]
    public async Task Given_no_Google_identity_When_the_screen_finishes_Then_it_is_refused_google_email_unverified()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await CompleteAsync(client, cookie: null);

        await AssertRefusedAsync(response, HttpStatusCode.Unauthorized, "google_email_unverified");
    }

    [Fact]
    public async Task Given_a_Google_account_whose_email_is_not_verified_When_the_screen_finishes_Then_it_is_refused_and_nobody_is_signed_in_or_linked()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "grace.google.unverified@example.org");
        var google = new GoogleAccount { Email = "grace.google.unverified@example.org", EmailVerified = false };

        using var response = await CompleteAsync(client, await GoogleSignIn.ExternalCookieAsync(client, factory.Google, GoogleApp.Member, google));

        await AssertRefusedAsync(response, HttpStatusCode.Unauthorized, "google_email_unverified");
        Assert.Contains("expires=thu, 01 jan 1970 00:00:00 gmt", Browser.Attributes(Assert.IsType<string>(Browser.SetCookie(response, GoogleSignIn.ExternalCookieName))));
        // Not linked either: the same subject with a verified email of no account finds none.
        var verified = new GoogleAccount { Subject = google.Subject, Email = "nobody.google.unverified@gmail.com" };
        using var later = await CompleteAsync(client, await GoogleSignIn.ExternalCookieAsync(client, factory.Google, GoogleApp.Member, verified));
        await AssertRefusedAsync(later, HttpStatusCode.NotFound, "no_account");
    }

    [Fact]
    public async Task Given_a_verified_Google_account_with_no_member_account_When_the_screen_finishes_Then_it_is_refused_no_account_naming_the_account_and_the_identity_is_kept()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await CompleteAsync(client, await GoogleSignIn.ExternalCookieAsync(client, factory.Google, GoogleApp.Member, new GoogleAccount { Email = "new.google.person@gmail.com" }));

        var problem = await AssertRefusedAsync(response, HttpStatusCode.NotFound, "no_account");
        Assert.Equal("new.google.person@gmail.com", problem.GetProperty("account").GetString());
        // Kept for "Create my profile": the cookie is not deleted.
        Assert.Null(Browser.SetCookie(response, GoogleSignIn.ExternalCookieName));
    }

    [Fact]
    public async Task Given_a_suspended_member_When_they_finish_Google_sign_in_Then_it_is_refused_account_suspended()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "grace.google.suspended@example.org");
        await factory.SuspendAsync("grace.google.suspended@example.org");

        using var response = await CompleteAsync(client, await GoogleSignIn.ExternalCookieAsync(client, factory.Google, GoogleApp.Member, new GoogleAccount { Email = "grace.google.suspended@example.org" }));

        await AssertRefusedAsync(response, HttpStatusCode.Forbidden, "account_suspended");
        Assert.Contains("expires=thu, 01 jan 1970 00:00:00 gmt", Browser.Attributes(Assert.IsType<string>(Browser.SetCookie(response, GoogleSignIn.ExternalCookieName))));
    }

    private static async Task<HttpResponseMessage> CompleteAsync(HttpClient client, string? cookie)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(CompletePath, UriKind.Relative)) { Content = JsonContent.Create(new { }) };
        if (cookie is not null)
        {
            request.Headers.Add("Cookie", cookie);
        }

        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }

    private static async Task<JsonElement> AssertRefusedAsync(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        Assert.Equal(status, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(code, problem.GetProperty("code").GetString());
        Assert.Null(Browser.SessionSetCookie(response));
        return problem;
    }
}
