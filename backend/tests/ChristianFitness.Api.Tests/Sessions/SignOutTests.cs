using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ChristianFitness.Api.Tests.Sessions;

/// <summary>
/// L2-004 AC5: a signed-in member who signs out has their session ended on the server, so the
/// cookie they held opens nothing afterwards, even if it was copied before.
/// </summary>
public sealed class SignOutTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string Password = "abundantlife";

    [Fact]
    public async Task Given_a_signed_in_member_When_they_sign_out_Then_it_answers_204_and_expires_the_session_cookie()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await SignedInAsync(client, "grace.signout@example.org");

        using var response = await Browser.SendAsync(client, HttpMethod.Delete, "/api/session", cookie);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var attributes = Browser.Attributes(Assert.IsType<string>(Browser.SessionSetCookie(response)));
        Assert.Contains("expires=thu, 01 jan 1970 00:00:00 gmt", attributes);
        Assert.Contains("secure", attributes);
        Assert.Contains("path=/", attributes);
    }

    [Fact]
    public async Task Given_a_member_who_signed_out_When_the_cookie_they_held_is_sent_again_Then_it_is_refused_with_401()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await SignedInAsync(client, "grace.signout.replay@example.org");
        using (var before = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", cookie))
        {
            Assert.Equal(HttpStatusCode.OK, before.StatusCode);
        }

        using var signedOut = await Browser.SendAsync(client, HttpMethod.Delete, "/api/session", cookie);
        Assert.Equal(HttpStatusCode.NoContent, signedOut.StatusCode);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", cookie);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("unauthenticated", problem.GetProperty("code").GetString());
    }

    // Signing out on one device leaves the member's other sessions alone.
    [Fact]
    public async Task Given_a_member_signed_in_twice_When_one_session_signs_out_Then_the_other_stays_signed_in()
    {
        using var client = Browser.CreateClient(factory);
        var phone = await SignedInAsync(client, "grace.signout.two@example.org");
        using var again = await Browser.SignInAsync(client, "grace.signout.two@example.org", Password);
        var laptop = Browser.SessionCookie(again);

        using var signedOut = await Browser.SendAsync(client, HttpMethod.Delete, "/api/session", phone);
        Assert.Equal(HttpStatusCode.NoContent, signedOut.StatusCode);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", laptop);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Given_no_session_When_signing_out_Then_it_is_refused_with_401()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Delete, "/api/session", cookie: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("unauthenticated", problem.GetProperty("code").GetString());
    }

    /// <summary>Joins and signs in; answers the session cookie to send back.</summary>
    private static async Task<string> SignedInAsync(HttpClient client, string email)
    {
        await SignInTests.JoinAsync(client, email);
        using var response = await Browser.SignInAsync(client, email, Password);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return Browser.SessionCookie(response);
    }
}
