using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;

namespace ChristianFitness.Api.Tests.Sessions;

/// <summary>
/// L2-004 AC1 and AC2, L2-030 AC2: a registered member signs in with the correct email and
/// password and gets a secure, HTTP-only, SameSite session cookie; a wrong password or an unknown
/// email gets one generic refusal that does not say which was wrong.
/// </summary>
public sealed class SignInTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string Password = "abundantlife";

    [Fact]
    public async Task Given_a_registered_member_When_they_sign_in_with_the_correct_email_and_password_Then_the_session_is_answered()
    {
        using var client = Browser.CreateClient(factory);
        var memberId = await JoinAsync(client, "grace.signin@example.org");

        using var response = await Browser.SignInAsync(client, "grace.signin@example.org", Password);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var session = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["memberId", "name"], session.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(memberId, session.GetProperty("memberId").GetString());
        Assert.Equal("Grace Thompson", session.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Given_a_registered_member_When_they_sign_in_Then_the_session_cookie_is_secure_http_only_lax_and_host_prefixed()
    {
        using var client = Browser.CreateClient(factory);
        await JoinAsync(client, "grace.signin.cookie@example.org");

        using var response = await Browser.SignInAsync(client, "grace.signin.cookie@example.org", Password);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var attributes = Browser.Attributes(Assert.IsType<string>(Browser.SessionSetCookie(response)));
        Assert.Contains("secure", attributes);
        Assert.Contains("httponly", attributes);
        Assert.Contains("samesite=lax", attributes);
        Assert.Contains("path=/", attributes);
        Assert.DoesNotContain(attributes, a => a.StartsWith("domain=", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Given_a_member_who_signed_in_When_they_ask_for_their_session_with_the_cookie_Then_it_answers_who_they_are()
    {
        using var client = Browser.CreateClient(factory);
        var memberId = await JoinAsync(client, "grace.signin.next@example.org");
        using var signedIn = await Browser.SignInAsync(client, "grace.signin.next@example.org", Password);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", Browser.SessionCookie(signedIn));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var session = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(memberId, session.GetProperty("memberId").GetString());
    }

    // The email is the account's lookup key: trimmed and compared case-insensitively, as at Join.
    [Theory]
    [InlineData("Grace.Case@Example.ORG")]
    [InlineData("  grace.case@example.org ")]
    public async Task Given_the_email_in_another_case_or_with_spaces_When_a_member_signs_in_Then_it_is_their_account(string given)
    {
        using var client = Browser.CreateClient(factory);
        var memberId = await JoinOnceAsync(client, "grace.case@example.org");

        using var response = await Browser.SignInAsync(client, given, Password);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var session = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(memberId, session.GetProperty("memberId").GetString());
    }

    [Theory]
    [InlineData("grace.refused@example.org", "abundantlifE")]
    [InlineData("nobody.here@example.org", Password)]
    [InlineData("grace.refused@example.org", "")]
    [InlineData("", Password)]
    public async Task Given_a_wrong_password_or_an_unknown_email_When_signing_in_Then_it_is_refused_with_invalid_credentials(string email, string password)
    {
        using var client = Browser.CreateClient(factory);
        await JoinOnceAsync(client, "grace.refused@example.org");

        using var response = await Browser.SignInAsync(client, email, password);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["code", "status", "title", "traceId", "type"], problem.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("invalid_credentials", problem.GetProperty("code").GetString());
        Assert.Equal(401, problem.GetProperty("status").GetInt32());
        Assert.Null(Browser.SessionSetCookie(response));
    }

    // L2-004 AC2: the answer for an unknown email is the answer for a wrong password, word for word.
    [Fact]
    public async Task Given_an_unknown_email_and_a_wrong_password_When_each_is_refused_Then_the_answers_are_the_same()
    {
        using var client = Browser.CreateClient(factory);
        await JoinOnceAsync(client, "grace.same@example.org");

        using var wrongPassword = await Browser.SignInAsync(client, "grace.same@example.org", "not-her-password");
        using var unknownEmail = await Browser.SignInAsync(client, "nobody.same@example.org", "not-her-password");

        Assert.Equal(HttpStatusCode.Unauthorized, wrongPassword.StatusCode);
        Assert.Equal(wrongPassword.StatusCode, unknownEmail.StatusCode);
        Assert.Equal(await WithoutTraceIdAsync(wrongPassword), await WithoutTraceIdAsync(unknownEmail));
    }

    /// <summary>The body's members but the trace id, which names the request, not the answer.</summary>
    private static async Task<string[]> WithoutTraceIdAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return [.. body.EnumerateObject().Where(p => p.Name != "traceId").Select(p => $"{p.Name}={p.Value}")];
    }

    private static readonly SemaphoreSlim Joining = new(1, 1);
    private static readonly Dictionary<string, string> Joined = new(StringComparer.Ordinal);

    /// <summary>Joins once per email for the class: the theories share one member.</summary>
    private static async Task<string> JoinOnceAsync(HttpClient client, string email)
    {
        await Joining.WaitAsync(TestContext.Current.CancellationToken);
        try
        {
            if (!Joined.TryGetValue(email, out var id))
            {
                id = await JoinAsync(client, email);
                Joined[email] = id;
            }

            return id;
        }
        finally
        {
            Joining.Release();
        }
    }

    /// <summary>Joins through the API, as a visitor would, and answers the new member's id.</summary>
    internal static async Task<string> JoinAsync(HttpClient client, string email)
    {
        using var response = await client.PostAsJsonAsync(new Uri("/api/account/join", UriKind.Relative), JoinTests.Details(email), TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var session = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return session.GetProperty("memberId").GetString()!;
    }
}
