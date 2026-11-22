using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Sessions;

/// <summary>
/// L2-030 AC3 (ADR 0009): a state-changing request that does not carry the antiforgery token the
/// app reads from <c>__Host-cf-xsrf</c>, as a request from another origin cannot, is refused with
/// 400 <c>antiforgery_failed</c> before anything changes; the token is bound to who holds it.
/// </summary>
public sealed class AntiforgeryTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string Password = "abundantlife";

    [Fact]
    public async Task Given_a_visitor_When_they_ask_for_a_token_Then_it_is_set_in_a_readable_strict_host_prefixed_cookie()
    {
        using var client = Browser.CreateClientWithoutToken(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/antiforgery", cookie: null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var token = Browser.Attributes(Assert.IsType<string>(Browser.SetCookie(response, Browser.TokenCookieName)));
        Assert.Contains("secure", token);
        Assert.Contains("samesite=strict", token);
        Assert.Contains("path=/", token);
        Assert.DoesNotContain("httponly", token);
        Assert.DoesNotContain(token, a => a.StartsWith("domain=", StringComparison.Ordinal));
        var antiforgery = Browser.Attributes(Assert.IsType<string>(Browser.SetCookie(response, Browser.AntiforgeryCookieName)));
        Assert.Contains("secure", antiforgery);
        Assert.Contains("httponly", antiforgery);
        Assert.Contains("samesite=strict", antiforgery);
        Assert.Contains("path=/", antiforgery);
    }

    // Behind the development proxy or a proxy that ends TLS, the API sees plain HTTP; the cookies
    // stay Secure, as the __Host- prefix requires.
    [Fact]
    public async Task Given_a_plain_http_request_When_a_visitor_asks_for_a_token_Then_both_cookies_are_still_secure()
    {
        using var client = factory.CreateDefaultClient(new Uri("http://localhost"));

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/antiforgery", cookie: null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains("secure", Browser.Attributes(Assert.IsType<string>(Browser.SetCookie(response, Browser.TokenCookieName))));
        Assert.Contains("secure", Browser.Attributes(Assert.IsType<string>(Browser.SetCookie(response, Browser.AntiforgeryCookieName))));
    }

    [Fact]
    public async Task Given_no_token_When_a_visitor_joins_Then_it_is_refused_with_antiforgery_failed_and_nothing_is_created()
    {
        using var client = Browser.CreateClientWithoutToken(factory);

        using var response = await client.PostAsJsonAsync(new Uri("/api/account/join", UriKind.Relative), JoinTests.Details("grace.forged@example.org"), TestContext.Current.CancellationToken);

        await AssertRefusedAsync(response);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await db.Members.AnyAsync(m => m.NormalizedEmail == "grace.forged@example.org", TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_no_token_When_signing_in_Then_it_is_refused_with_antiforgery_failed()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "grace.forged.signin@example.org");
        using var bare = Browser.CreateClientWithoutToken(factory);

        using var response = await Browser.SignInAsync(bare, "grace.forged.signin@example.org", Password);

        await AssertRefusedAsync(response);
        Assert.Null(Browser.SessionSetCookie(response));
    }

    [Fact]
    public async Task Given_a_signed_in_member_When_a_request_without_the_token_signs_them_out_Then_it_is_refused_and_the_session_stays()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "grace.forged.signout@example.org");
        using var signedIn = await Browser.SignInAsync(client, "grace.forged.signout@example.org", Password);
        var cookie = Browser.SessionCookie(signedIn);
        using var bare = Browser.CreateClientWithoutToken(factory);

        using var response = await Browser.SendAsync(bare, HttpMethod.Delete, "/api/session", cookie);

        await AssertRefusedAsync(response);
        using var after = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", cookie);
        Assert.Equal(HttpStatusCode.OK, after.StatusCode);
    }

    // The token a visitor held is not the signed-in member's: sign-in answers with a new one.
    [Fact]
    public async Task Given_a_member_who_signed_in_When_they_sign_out_with_the_token_sign_in_gave_Then_it_succeeds_and_the_visitor_token_is_refused()
    {
        using var bare = Browser.CreateClientWithoutToken(factory);
        using (var joining = Browser.CreateClient(factory))
        {
            await SignInTests.JoinAsync(joining, "grace.token@example.org");
        }

        using var visitor = await Browser.SendAsync(bare, HttpMethod.Get, "/api/antiforgery", cookie: null);
        var visitorCookies = Browser.CookiesOf(visitor);
        using var signIn = new HttpRequestMessage(HttpMethod.Post, new Uri("/api/session", UriKind.Relative))
        {
            Content = JsonContent.Create(new { email = "grace.token@example.org", password = Password }),
        };
        signIn.Headers.Add("Cookie", Browser.CookieHeader(visitorCookies, Browser.AntiforgeryCookieName));
        signIn.Headers.Add(Browser.TokenHeader, visitorCookies[Browser.TokenCookieName]);
        using var signedIn = await bare.SendAsync(signIn, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, signedIn.StatusCode);
        var memberCookies = Browser.CookiesOf(signedIn);
        Assert.NotEqual(visitorCookies[Browser.TokenCookieName], memberCookies[Browser.TokenCookieName]);

        using var withVisitorToken = SignOut(visitorCookies[Browser.AntiforgeryCookieName], memberCookies[Browser.SessionCookieName], visitorCookies[Browser.TokenCookieName]);
        using var refused = await bare.SendAsync(withVisitorToken, TestContext.Current.CancellationToken);
        await AssertRefusedAsync(refused);

        using var withMemberToken = SignOut(visitorCookies[Browser.AntiforgeryCookieName], memberCookies[Browser.SessionCookieName], memberCookies[Browser.TokenCookieName]);
        using var signedOut = await bare.SendAsync(withMemberToken, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, signedOut.StatusCode);
    }

    private static HttpRequestMessage SignOut(string antiforgery, string session, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, new Uri("/api/session", UriKind.Relative));
        request.Headers.Add("Cookie", $"{Browser.AntiforgeryCookieName}={antiforgery}; {Browser.SessionCookieName}={session}");
        request.Headers.Add(Browser.TokenHeader, token);
        return request;
    }

    private static async Task AssertRefusedAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("antiforgery_failed", problem.GetProperty("code").GetString());
        Assert.Equal(400, problem.GetProperty("status").GetInt32());
    }
}
