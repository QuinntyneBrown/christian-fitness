using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;

namespace ChristianFitness.Api.Tests.Google;

/// <summary>
/// L2-049 AC1, AC13; L2-003 AC7; L2-004 AC7: starting a member's Google sign-in answers Google's
/// authorization address, carrying a <c>state</c>, a nonce and a PKCE challenge made for this
/// attempt, the <c>openid email profile</c> scopes only and the member app's registered redirect
/// address; the browser leaves for it in a full-page redirect.
/// </summary>
public sealed class StartGoogleSignInTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Given_a_visitor_When_they_start_Google_sign_in_Then_the_answer_is_Google_authorization_address_with_the_attempt_s_protections()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await GoogleSignIn.StartAsync(client, GoogleApp.Member, new { intent = "sign-in", returnUrl = "/events" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["location"], answer.EnumerateObject().Select(p => p.Name));
        var location = new Uri(answer.GetProperty("location").GetString()!);
        Assert.Equal(FakeGoogle.AuthorizationEndpoint, location.GetLeftPart(UriPartial.Path));
        var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(location.Query);
        Assert.Equal(FakeGoogle.ClientId, query["client_id"].ToString());
        Assert.Equal("code", query["response_type"].ToString());
        // Google answers by GET (the code flow's default, query), never by a cross-site form post.
        Assert.False(query.ContainsKey("response_mode"));
        Assert.Equal("openid email profile", query["scope"].ToString());
        Assert.Equal(ApiFactory.MemberAppBaseUrl + GoogleSignIn.MemberCallbackPath, query["redirect_uri"].ToString());
        Assert.Equal("S256", query["code_challenge_method"].ToString());
        Assert.False(string.IsNullOrEmpty(query["code_challenge"].ToString()));
        Assert.False(string.IsNullOrEmpty(query["state"].ToString()));
        Assert.False(string.IsNullOrEmpty(query["nonce"].ToString()));
        // The member app never limits the account to a domain, and asks for the chooser only on request.
        Assert.False(query.ContainsKey("hd"));
        Assert.False(query.ContainsKey("prompt"));
    }

    [Fact]
    public async Task Given_two_starts_When_they_are_compared_Then_each_has_its_own_state_nonce_and_challenge()
    {
        using var client = Browser.CreateClient(factory);

        var first = await GoogleSignIn.BeginAsync(client, GoogleApp.Member);
        var second = await GoogleSignIn.BeginAsync(client, GoogleApp.Member);

        Assert.NotEqual(first.Query["state"], second.Query["state"]);
        Assert.NotEqual(first.Query["nonce"], second.Query["nonce"]);
        Assert.NotEqual(first.Query["code_challenge"], second.Query["code_challenge"]);
    }

    [Theory]
    [InlineData("sign-in")]
    [InlineData("join")]
    public async Task Given_another_account_is_asked_for_When_Google_sign_in_starts_Then_Google_shows_its_account_chooser(string intent)
    {
        using var client = Browser.CreateClient(factory);

        var attempt = await GoogleSignIn.BeginAsync(client, GoogleApp.Member, new { intent, selectAccount = true });

        Assert.Equal("select_account", attempt.Query["prompt"]);
    }

    [Fact]
    public async Task Given_a_start_When_it_answers_Then_the_browser_holds_the_attempt_only_in_cookies_it_cannot_read()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await GoogleSignIn.StartAsync(client, GoogleApp.Member);

        var setCookies = response.Headers.GetValues("Set-Cookie").Where(c => c.StartsWith(".AspNetCore.", StringComparison.Ordinal)).ToList();
        Assert.Equal(2, setCookies.Count);
        foreach (var attributes in setCookies.Select(Browser.Attributes))
        {
            Assert.Contains("secure", attributes);
            Assert.Contains("httponly", attributes);
            Assert.Contains("samesite=lax", attributes);
        }
    }

    [Theory]
    [InlineData("staff")]
    [InlineData("")]
    [InlineData(null)]
    public async Task Given_an_intent_that_is_not_sign_in_or_join_When_a_start_is_asked_Then_it_is_refused_and_nothing_leaves_for_Google(string? intent)
    {
        using var client = Browser.CreateClient(factory);

        using var response = await GoogleSignIn.StartAsync(client, GoogleApp.Member, new { intent });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_start_without_the_antiforgery_token_When_it_is_sent_Then_it_is_refused()
    {
        using var client = Browser.CreateClientWithoutToken(factory);

        using var response = await GoogleSignIn.StartAsync(client, GoogleApp.Member);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}

/// <summary>
/// L2-049 AC7: more than 20 Google sign-ins started from one network in 15 minutes refuse the next
/// with <c>too_many_attempts</c> and HTTP 429. Its own class: it fills one address's window.
/// </summary>
public sealed class StartGoogleSignInLimitTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Given_20_starts_from_one_network_When_a_21st_is_asked_Then_it_is_refused_too_many_attempts()
    {
        using var client = Browser.CreateClient(factory);
        for (var i = 0; i < 20; i++)
        {
            using var allowed = await GoogleSignIn.StartAsync(client, GoogleApp.Member, clientAddress: "203.0.113.20");
            Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        }

        using var refused = await GoogleSignIn.StartAsync(client, GoogleApp.Member, clientAddress: "203.0.113.20");
        using var otherNetwork = await GoogleSignIn.StartAsync(client, GoogleApp.Member, clientAddress: "198.51.100.7");

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        var problem = await refused.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("too_many_attempts", problem.GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.OK, otherNetwork.StatusCode);
    }
}

/// <summary>
/// L2-049 AC11: Google not configured, or not reachable, refuses the start with
/// <c>google_unavailable</c> and HTTP 503, and nothing leaves for Google.
/// </summary>
public sealed class StartGoogleSignInUnavailableTests(StartGoogleSignInUnavailableTests.UnconfiguredFactory unconfigured, ApiFactory factory)
    : IClassFixture<StartGoogleSignInUnavailableTests.UnconfiguredFactory>, IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Given_no_Google_client_is_configured_When_a_start_is_asked_Then_it_is_refused_google_unavailable()
    {
        using var client = Browser.CreateClient(unconfigured);

        using var response = await GoogleSignIn.StartAsync(client, GoogleApp.Member);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("google_unavailable", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_Google_cannot_be_reached_When_a_start_is_asked_Then_it_is_refused_google_unavailable()
    {
        using var client = Browser.CreateClient(factory);
        factory.Google.Down = true;
        try
        {
            using var response = await GoogleSignIn.StartAsync(client, GoogleApp.Member);

            Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
            var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
            Assert.Equal("google_unavailable", problem.GetProperty("code").GetString());
        }
        finally
        {
            factory.Google.Down = false;
        }
    }

    /// <summary>The API with no Google client: the settings are blank.</summary>
    public sealed class UnconfiguredFactory : ApiFactory
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.UseSetting("Google:ClientId", string.Empty);
            builder.UseSetting("Google:ClientSecret", string.Empty);
        }
    }
}
