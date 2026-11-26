using System.Net;
using ChristianFitness.Infrastructure.Security.Google;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Google;

/// <summary>
/// L2-049 AC2, AC5, AC6 and AC12: Google's answer comes back to the API's callback, which exchanges
/// the code itself, checks the ID token and the attempt, keeps only the Google identity in the
/// <c>__Host-cf-google</c> cookie and sends the browser back to the screen that started it with
/// <c>google=returned</c>; anything wrong sends it back with <c>google=failed</c> and keeps nothing,
/// and a cancel at Google sends it back with no marker.
/// </summary>
public sealed class GoogleCallbackTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Given_Google_answers_with_a_code_When_the_browser_returns_Then_the_server_exchanges_it_with_the_PKCE_verifier_and_returns_to_the_screen()
    {
        using var client = Browser.CreateClient(factory);
        var attempt = await GoogleSignIn.BeginAsync(client, GoogleApp.Member, new { intent = "sign-in", returnUrl = "/events/today" });
        var account = new GoogleAccount { Email = "grace.callback@gmail.com" };

        using var returned = await GoogleSignIn.ReturnAsync(client, factory.Google, attempt, account);

        Assert.Equal(HttpStatusCode.Redirect, returned.StatusCode);
        Assert.Equal("/sign-in?google=returned&returnUrl=%2Fevents%2Ftoday", returned.Headers.Location?.OriginalString);
        var exchange = factory.Google.Exchanges[^1];
        Assert.Equal("authorization_code", exchange["grant_type"]);
        Assert.Equal(FakeGoogle.ClientId, exchange["client_id"]);
        Assert.False(string.IsNullOrEmpty(exchange["code_verifier"]));
        Assert.Equal(ApiFactory.MemberAppBaseUrl + GoogleSignIn.MemberCallbackPath, exchange["redirect_uri"]);
    }

    [Fact]
    public async Task Given_a_join_attempt_When_Google_answers_Then_the_browser_returns_to_Join()
    {
        using var client = Browser.CreateClient(factory);
        var attempt = await GoogleSignIn.BeginAsync(client, GoogleApp.Member, new { intent = "join" });

        using var returned = await GoogleSignIn.ReturnAsync(client, factory.Google, attempt, new GoogleAccount { Email = "grace.callback.join@gmail.com" });

        Assert.Equal("/join?google=returned", returned.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task Given_Google_answers_When_the_browser_returns_Then_it_holds_only_the_Google_identity_in_a_cookie_it_cannot_read()
    {
        using var client = Browser.CreateClient(factory);
        var attempt = await GoogleSignIn.BeginAsync(client, GoogleApp.Member);
        var account = new GoogleAccount { Email = "grace.callback.cookie@gmail.com", Picture = "https://lh3.googleusercontent.com/a/grace" };

        using var returned = await GoogleSignIn.ReturnAsync(client, factory.Google, attempt, account);

        var setCookie = Assert.IsType<string>(Browser.SetCookie(returned, GoogleSignIn.ExternalCookieName));
        var attributes = Browser.Attributes(setCookie);
        Assert.Contains("secure", attributes);
        Assert.Contains("httponly", attributes);
        Assert.Contains("samesite=lax", attributes);
        Assert.Contains("path=/", attributes);
        Assert.DoesNotContain(attributes, a => a.StartsWith("domain=", StringComparison.Ordinal));
        var ticket = Unprotect(Browser.CookiesOf(returned)[GoogleSignIn.ExternalCookieName]);
        Assert.Equal(
            ["email", "email_verified", "name", "picture", "sub"],
            ticket.Principal.Claims.Select(claim => claim.Type).Order(StringComparer.Ordinal));
        Assert.Equal(account.Subject, ticket.Principal.FindFirst("sub")?.Value);
        Assert.Equal(account.Email, ticket.Principal.FindFirst("email")?.Value);
        // No token, code, state or nonce is kept with it.
        Assert.Equal([".AuthScheme", ".expires", ".issued"], ticket.Properties.Items.Keys.Order(StringComparer.Ordinal));
        // Nothing of Google's answer reaches the browser in the response either.
        Assert.Equal(0, returned.Content.Headers.ContentLength ?? 0);
    }

    public static TheoryData<string, string> Failures => new()
    {
        { "another state", "state" },
        { "another nonce", "nonce" },
        { "a token Google did not sign", "signature" },
        { "a token for another client", "audience" },
        { "a token from another issuer", "issuer" },
        { "an expired token", "expiry" },
        { "an exchange Google refuses", "exchange" },
        { "an error from Google", "error" },
        { "no attempt cookie", "cookies" },
    };

    [Theory]
    [MemberData(nameof(Failures))]
    public async Task Given_an_answer_that_fails_a_check_When_the_browser_returns_Then_it_returns_to_the_screen_saying_it_did_not_finish_and_keeps_nothing(string why, string failure)
    {
        Assert.False(string.IsNullOrEmpty(why));
        using var client = Browser.CreateClient(factory);
        var attempt = await GoogleSignIn.BeginAsync(client, GoogleApp.Member, new { intent = "sign-in", returnUrl = "/events" });
        var account = new GoogleAccount
        {
            Email = $"grace.callback.{failure}@gmail.com",
            Nonce = failure == "nonce" ? "another-nonce" : null,
            SignedElsewhere = failure == "signature",
            Tamper = failure switch
            {
                "audience" => claims => claims["aud"] = "another-client.apps.googleusercontent.com",
                "issuer" => claims => claims["iss"] = "https://accounts.example.org",
                "expiry" => claims =>
                {
                    claims["iat"] = DateTimeOffset.UtcNow.AddHours(-3).ToUnixTimeSeconds();
                    claims["exp"] = DateTimeOffset.UtcNow.AddHours(-2).ToUnixTimeSeconds();
                },
                _ => null,
            },
        };
        factory.Google.RefusesExchange = failure == "exchange";
        try
        {
            using var returned = failure switch
            {
                "state" => await AnswerAsync(client, attempt, account, state: "another-state"),
                "error" => await GoogleSignIn.CallbackAsync(client, attempt, $"error=server_error&state={Uri.EscapeDataString(attempt.Query["state"])}"),
                "cookies" => await AnswerAsync(client, attempt with { Cookies = new Dictionary<string, string>() }, account),
                _ => await GoogleSignIn.ReturnAsync(client, factory.Google, attempt, account),
            };

            Assert.Equal(HttpStatusCode.Redirect, returned.StatusCode);
            // A bad state cannot be read, and the handler fails a nonce without the attempt: either
            // way its return address is gone too.
            var expected = failure is "state" or "nonce"
                ? "/sign-in?google=failed"
                : "/sign-in?google=failed&returnUrl=%2Fevents";
            Assert.Equal(expected, returned.Headers.Location?.OriginalString);
            Assert.Null(Browser.SetCookie(returned, GoogleSignIn.ExternalCookieName));
            Assert.Null(Browser.SessionSetCookie(returned));
        }
        finally
        {
            factory.Google.RefusesExchange = false;
        }
    }

    [Fact]
    public async Task Given_a_join_attempt_that_fails_When_the_browser_returns_Then_Join_says_it_did_not_finish()
    {
        using var client = Browser.CreateClient(factory);
        var attempt = await GoogleSignIn.BeginAsync(client, GoogleApp.Member, new { intent = "join" });

        using var returned = await GoogleSignIn.CallbackAsync(client, attempt, $"error=server_error&state={Uri.EscapeDataString(attempt.Query["state"])}");

        Assert.Equal("/join?google=failed", returned.Headers.Location?.OriginalString);
    }

    [Theory]
    [InlineData("sign-in", "/sign-in?returnUrl=%2Fevents")]
    [InlineData("join", "/join")]
    public async Task Given_the_person_cancels_at_Google_When_the_browser_returns_Then_it_is_the_screen_with_no_message(string intent, string screen)
    {
        using var client = Browser.CreateClient(factory);
        var attempt = await GoogleSignIn.BeginAsync(client, GoogleApp.Member, intent == "join" ? new { intent } : new { intent, returnUrl = "/events" });

        using var returned = await GoogleSignIn.CallbackAsync(client, attempt, $"error=access_denied&state={Uri.EscapeDataString(attempt.Query["state"])}");

        Assert.Equal(HttpStatusCode.Redirect, returned.StatusCode);
        Assert.Equal(screen, returned.Headers.Location?.OriginalString);
        Assert.Null(Browser.SetCookie(returned, GoogleSignIn.ExternalCookieName));
    }

    private Task<HttpResponseMessage> AnswerAsync(HttpClient client, GoogleAttempt attempt, GoogleAccount account, string? state = null)
    {
        account.Nonce ??= attempt.Query["nonce"];
        var code = "code-" + Guid.NewGuid().ToString("N");
        factory.Google.Answer(code, account);
        return GoogleSignIn.CallbackAsync(client, attempt, $"code={code}&state={Uri.EscapeDataString(state ?? attempt.Query["state"])}");
    }

    private Microsoft.AspNetCore.Authentication.AuthenticationTicket Unprotect(string cookie)
    {
        var options = factory.Services.GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>().Get(GoogleAuthentication.ExternalScheme);
        return Assert.IsType<Microsoft.AspNetCore.Authentication.AuthenticationTicket>(options.TicketDataFormat.Unprotect(Uri.UnescapeDataString(cookie)));
    }
}

/// <summary>L2-049 AC5: an attempt older than 10 minutes is not finished; the clock is moved, never slept on.</summary>
public sealed class GoogleAttemptExpiryTests(GoogleClockApiFactory factory) : IClassFixture<GoogleClockApiFactory>
{
    [Fact]
    public async Task Given_an_attempt_started_more_than_10_minutes_ago_When_Google_answers_Then_it_did_not_finish()
    {
        using var client = Browser.CreateClient(factory);
        var attempt = await GoogleSignIn.BeginAsync(client, GoogleApp.Member);
        factory.Time.Advance(TimeSpan.FromMinutes(10) + TimeSpan.FromSeconds(1));

        using var returned = await GoogleSignIn.ReturnAsync(client, factory.Google, attempt, new GoogleAccount { Email = "grace.callback.late@gmail.com" });

        Assert.Equal("/sign-in?google=failed", returned.Headers.Location?.OriginalString);
        Assert.Null(Browser.SetCookie(returned, GoogleSignIn.ExternalCookieName));
    }

    [Fact]
    public async Task Given_an_attempt_started_just_under_10_minutes_ago_When_Google_answers_Then_it_returns()
    {
        using var client = Browser.CreateClient(factory);
        var attempt = await GoogleSignIn.BeginAsync(client, GoogleApp.Member);
        factory.Time.Advance(TimeSpan.FromMinutes(10) - TimeSpan.FromSeconds(1));

        using var returned = await GoogleSignIn.ReturnAsync(client, factory.Google, attempt, new GoogleAccount { Email = "grace.callback.intime@gmail.com" });

        Assert.Equal("/sign-in?google=returned", returned.Headers.Location?.OriginalString);
    }
}

/// <summary>The API on a clock the Google tests move (never sleep).</summary>
public sealed class GoogleClockApiFactory : ApiFactory
{
    public FakeTimeProvider Time { get; } = new(DateTimeOffset.UtcNow);

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(Time);
    }
}
