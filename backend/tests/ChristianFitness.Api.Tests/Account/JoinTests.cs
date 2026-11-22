using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-003 AC1 and AC4, L2-030 AC1 and AC2, L2-033 AC1: a visitor who joins with valid details has
/// an account, with the password stored only as a PBKDF2 hash and an optional home church, and is
/// signed in by a secure session cookie that the next request carries.
/// </summary>
public sealed class JoinTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string Password = "abundantlife";

    [Fact]
    public async Task Given_valid_details_When_a_visitor_joins_Then_the_account_is_created_and_the_session_is_answered()
    {
        using var client = CreateClient();

        using var response = await JoinAsync(client, Details("grace.join@example.org"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("/api/session", response.Headers.Location?.OriginalString);
        var session = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["memberId", "name"], session.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("Grace Thompson", session.GetProperty("name").GetString());

        var member = await FindAsync("grace.join@example.org");
        Assert.Equal(member.Id.ToString(), session.GetProperty("memberId").GetString());
        Assert.Equal("Grace Thompson", member.Name);
        Assert.Equal("Grace Fellowship, Scarborough", member.HomeChurch);
        Assert.Equal(["running", "strength"], member.Interests);
        Assert.Equal("Active", member.Status.ToString());
    }

    [Fact]
    public async Task Given_valid_details_When_a_visitor_joins_Then_the_password_is_stored_only_as_a_PBKDF2_hash()
    {
        using var client = CreateClient();

        using var response = await JoinAsync(client, Details("grace.hash@example.org"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.DoesNotContain(Password, body, StringComparison.Ordinal);
        var member = await FindAsync("grace.hash@example.org");
        Assert.NotEqual(Password, member.PasswordHash);
        Assert.Equal(PasswordVerificationResult.Success, new PasswordHasher<object>().VerifyHashedPassword(new object(), member.PasswordHash, Password));
        // Identity's version 3 format (PBKDF2 with HMAC-SHA512) starts with the byte 0x01.
        Assert.Equal(0x01, Convert.FromBase64String(member.PasswordHash)[0]);
    }

    [Fact]
    public async Task Given_valid_details_When_a_visitor_joins_Then_the_session_cookie_is_secure_http_only_lax_and_host_prefixed()
    {
        using var client = CreateClient();

        using var response = await JoinAsync(client, Details("grace.cookie@example.org"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var cookie = Assert.Single(response.Headers.GetValues("Set-Cookie"), value => value.StartsWith("__Host-cf-session=", StringComparison.Ordinal));
        var attributes = cookie.Split(';', StringSplitOptions.TrimEntries).Skip(1).Select(a => a.ToLowerInvariant()).ToList();
        Assert.Contains("secure", attributes);
        Assert.Contains("httponly", attributes);
        Assert.Contains("samesite=lax", attributes);
        Assert.Contains("path=/", attributes);
        Assert.DoesNotContain(attributes, a => a.StartsWith("domain=", StringComparison.Ordinal));
        Assert.Contains(attributes, a => a.StartsWith("expires=", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Given_a_member_who_just_joined_When_they_ask_for_their_session_Then_it_answers_who_they_are()
    {
        using var client = CreateClient();
        using var joined = await JoinAsync(client, Details("grace.session@example.org"));
        var cookie = SessionCookie(joined);

        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri("/api/session", UriKind.Relative));
        request.Headers.Add("Cookie", cookie);
        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var session = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        var member = await FindAsync("grace.session@example.org");
        Assert.Equal(["memberId", "name"], session.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(member.Id.ToString(), session.GetProperty("memberId").GetString());
        Assert.Equal("Grace Thompson", session.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Given_no_session_When_a_visitor_asks_for_their_session_Then_it_is_refused_with_401()
    {
        using var client = CreateClient();

        using var response = await client.GetAsync(new Uri("/api/session", UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("unauthenticated", problem.GetProperty("code").GetString());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Given_no_home_church_When_a_visitor_joins_Then_the_account_is_created_with_none(string? homeChurch)
    {
        using var client = CreateClient();
        var email = $"grace.nochurch.{homeChurch?.Length.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? "null"}@example.org";

        using var response = await JoinAsync(client, Details(email) with { HomeChurch = homeChurch });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Null((await FindAsync(email)).HomeChurch);
    }

    [Fact]
    public async Task Given_no_interests_When_a_visitor_joins_Then_the_account_is_created_with_none()
    {
        using var client = CreateClient();

        using var response = await JoinAsync(client, Details("grace.nointerests@example.org") with { Interests = [] });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Empty((await FindAsync("grace.nointerests@example.org")).Interests);
    }

    internal sealed record JoinBody(string FullName, string Email, string Password, string? HomeChurch, string[] Interests);

    internal static JoinBody Details(string email) =>
        new("Grace Thompson", email, Password, "Grace Fellowship, Scarborough", ["running", "strength"]);

    // The cookie is Secure: the client speaks HTTPS so it would keep it, but the tests read and send
    // it themselves, to see exactly what the API set.
    private HttpClient CreateClient() =>
        factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), HandleCookies = false });

    private static Task<HttpResponseMessage> JoinAsync(HttpClient client, JoinBody body) =>
        client.PostAsJsonAsync(new Uri("/api/account/join", UriKind.Relative), body, TestContext.Current.CancellationToken);

    private static string SessionCookie(HttpResponseMessage response) =>
        response.Headers.GetValues("Set-Cookie").Single(value => value.StartsWith("__Host-cf-session=", StringComparison.Ordinal)).Split(';')[0];

    private async Task<Domain.Members.Member> FindAsync(string email)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Members.AsNoTracking().SingleAsync(m => m.Email == email, TestContext.Current.CancellationToken);
    }
}
