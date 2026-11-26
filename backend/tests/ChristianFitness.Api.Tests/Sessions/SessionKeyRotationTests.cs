using System.Net;
using System.Net.Http.Json;

namespace ChristianFitness.Api.Tests.Sessions;

/// <summary>
/// Session fixation (OWASP ASVS 3.2.1; issue 148, ADR 0100): signing in again while a session
/// cookie is already sent issues a new session key and ends the old one on the server, so a copy of
/// the earlier cookie never inherits the new sign-in.
/// </summary>
public sealed class SessionKeyRotationTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string Password = "abundantlife";

    [Fact]
    public async Task Given_a_member_signed_in_When_they_sign_in_again_with_the_old_cookie_Then_a_new_key_is_issued_and_the_old_cookie_opens_nothing()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "grace.rotate@example.org");
        using var first = await Browser.SignInAsync(client, "grace.rotate@example.org", Password);
        var oldCookie = Browser.SessionCookie(first);

        using var again = new HttpRequestMessage(HttpMethod.Post, new Uri("/api/session", UriKind.Relative))
        {
            Content = JsonContent.Create(new { email = "grace.rotate@example.org", password = Password }),
        };
        again.Headers.Add("Cookie", oldCookie);
        using var second = await client.SendAsync(again, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var newCookie = Browser.SessionCookie(second);
        Assert.NotEqual(oldCookie, newCookie);
        using var withOld = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", oldCookie);
        Assert.Equal(HttpStatusCode.Unauthorized, withOld.StatusCode);
        using var withNew = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", newCookie);
        Assert.Equal(HttpStatusCode.OK, withNew.StatusCode);
    }
}
