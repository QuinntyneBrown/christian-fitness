using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ChristianFitness.Api.Tests.Sessions;

/// <summary>
/// L2-004 AC4: a suspended member who signs in with correct credentials is refused with code
/// <c>account_suspended</c> and HTTP 403, and gets no session; a wrong password gets the same
/// answer as anyone's, so the suspension is told only to whoever knows the password (ADR 0012).
/// The fixture suspends the member through the store, as staff will in slice 27.1.
/// </summary>
public sealed class SignInSuspendedTests(ProtectionsApiFactory factory) : IClassFixture<ProtectionsApiFactory>
{
    private const string Password = "abundantlife";

    [Fact]
    public async Task Given_a_suspended_member_When_they_sign_in_with_correct_credentials_Then_it_is_refused_with_account_suspended()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "tyler.suspended@example.org");
        await factory.SuspendAsync("tyler.suspended@example.org");

        using var response = await Browser.SignInAsync(client, "tyler.suspended@example.org", Password);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["code", "status", "title", "traceId", "type"], problem.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("account_suspended", problem.GetProperty("code").GetString());
        Assert.Equal(403, problem.GetProperty("status").GetInt32());
        Assert.Null(Browser.SessionSetCookie(response));
    }

    [Fact]
    public async Task Given_a_suspended_member_When_they_sign_in_with_a_wrong_password_Then_it_is_refused_with_invalid_credentials()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "tyler.wrong@example.org");
        await factory.SuspendAsync("tyler.wrong@example.org");

        using var response = await Browser.SignInAsync(client, "tyler.wrong@example.org", "not-his-password");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("invalid_credentials", problem.GetProperty("code").GetString());
        Assert.Null(Browser.SessionSetCookie(response));
    }
}
