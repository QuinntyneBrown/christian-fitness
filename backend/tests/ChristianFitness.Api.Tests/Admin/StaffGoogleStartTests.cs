using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Google;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.WebUtilities;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>
/// L2-018 AC1, AC10, L2-049 AC1, AC13 (ADR 0100): staff start Google sign-in from the admin app,
/// anonymously; the answer is Google's authorization address for the admin app's callback, limited
/// to the team's domain (<c>hd</c>), with the chooser only for "Try another Google account". While
/// the team's domain or the client is not set, the start is refused and nothing leaves for Google.
/// </summary>
public sealed class StaffGoogleStartTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Given_a_visitor_When_staff_start_Google_sign_in_Then_the_answer_is_Google_address_limited_to_the_team_domain()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await GoogleSignIn.StartAsync(client, GoogleApp.Staff, new { selectAccount = false });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["location"], answer.EnumerateObject().Select(p => p.Name));
        var location = new Uri(answer.GetProperty("location").GetString()!);
        Assert.Equal(FakeGoogle.AuthorizationEndpoint, location.GetLeftPart(UriPartial.Path));
        var query = QueryHelpers.ParseQuery(location.Query);
        Assert.Equal(FakeGoogle.StaffDomain, query["hd"].ToString());
        Assert.Equal("openid email profile", query["scope"].ToString());
        Assert.EndsWith(GoogleSignIn.StaffCallbackPath, query["redirect_uri"].ToString(), StringComparison.Ordinal);
        Assert.Equal("S256", query["code_challenge_method"].ToString());
        Assert.False(string.IsNullOrEmpty(query["state"].ToString()));
        Assert.False(string.IsNullOrEmpty(query["nonce"].ToString()));
        Assert.False(query.ContainsKey("prompt"));
    }

    [Fact]
    public async Task Given_staff_ask_for_another_Google_account_When_they_start_Then_Google_shows_its_account_chooser()
    {
        using var client = Browser.CreateClient(factory);

        var attempt = await GoogleSignIn.BeginAsync(client, GoogleApp.Staff, new { selectAccount = true });

        Assert.Equal("select_account", attempt.Query["prompt"]);
    }

    [Theory]
    [InlineData("Google:StaffDomain")]
    [InlineData("Google:ClientId")]
    [InlineData("Google:ClientSecret")]
    public async Task Given_a_Google_setting_is_missing_When_staff_start_Then_it_is_refused_google_unavailable_and_nothing_leaves(string missing)
    {
        using var unconfigured = factory.WithWebHostBuilder(builder => builder.UseSetting(missing, string.Empty));
        using var client = Browser.CreateClient(unconfigured);

        using var response = await GoogleSignIn.StartAsync(client, GoogleApp.Staff, new { selectAccount = false });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("google_unavailable", problem.GetProperty("code").GetString());
        Assert.False(problem.TryGetProperty("location", out _));
    }
}
