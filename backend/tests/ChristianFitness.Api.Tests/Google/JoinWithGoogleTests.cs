using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Sessions;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Google;

/// <summary>
/// L2-003 AC8, AC9, AC12, L2-049 AC3, AC12, AC14: a visitor back from Google with a verified account
/// that has no member account finishes their profile. <c>GET /api/account/google</c> answers the
/// Google account's email and name for the screen; <c>POST /api/account/join/google</c> creates the
/// account with the Google account's email, the name given, no password and the Google photo copied
/// once into the image store, and signs them in; <c>DELETE /api/account/google</c> ("Change")
/// forgets the Google account at once.
/// </summary>
public sealed class JoinWithGoogleTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string PendingPath = "/api/account/google";
    private const string JoinPath = "/api/account/join/google";

    [Fact]
    public async Task Given_a_verified_Google_account_with_no_member_account_When_Join_asks_for_it_Then_it_answers_the_email_and_name_only()
    {
        using var client = Browser.CreateClient(factory);
        var external = await JoinAttemptAsync(client, new GoogleAccount { Email = "grace.join.google.read@gmail.com", Name = "Grace Thompson", Picture = PhotoUrl("read") });

        using var response = await Browser.SendAsync(client, HttpMethod.Get, PendingPath, external);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var pending = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["email", "name"], pending.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("grace.join.google.read@gmail.com", pending.GetProperty("email").GetString());
        Assert.Equal("Grace Thompson", pending.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Given_no_Google_account_When_Join_asks_for_it_Then_it_is_refused_google_email_unverified()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, PendingPath, cookie: null);

        await AssertRefusedAsync(response, HttpStatusCode.Unauthorized, "google_email_unverified");
    }

    [Fact]
    public async Task Given_finish_your_profile_When_the_visitor_submits_it_Then_the_account_has_the_Google_email_the_name_given_no_password_and_they_are_signed_in()
    {
        using var client = Browser.CreateClient(factory);
        var google = new GoogleAccount { Email = "Grace.Join.Google@Gmail.com", Name = "Grace Thompson" };
        var external = await JoinAttemptAsync(client, google);

        using var response = await JoinAsync(client, external, new { fullName = "  Grace T  ", homeChurch = "Grace Fellowship", interests = Running, ageConfirmed = true });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var session = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["memberId", "name"], session.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("Grace T", session.GetProperty("name").GetString());
        using var me = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", Browser.SessionCookie(response));
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        Assert.Contains("expires=thu, 01 jan 1970 00:00:00 gmt", Browser.Attributes(Assert.IsType<string>(Browser.SetCookie(response, GoogleSignIn.ExternalCookieName))));
        var member = await MemberAsync(Guid.Parse(session.GetProperty("memberId").GetString()!));
        Assert.Equal("Grace.Join.Google@Gmail.com", member.Email);
        Assert.Equal(google.Subject, member.GoogleSubject);
        Assert.Equal(string.Empty, member.PasswordHash);
        Assert.Equal("Grace Fellowship", member.HomeChurch);
        Assert.Equal(["running"], member.Interests);
        Assert.NotNull(member.AcceptedTermsVersion);

        // The same Google account signs them in from now on.
        var again = await GoogleSignIn.ExternalCookieAsync(client, factory.Google, GoogleApp.Member, new GoogleAccount { Subject = google.Subject, Email = google.Email });
        using var signedIn = await CompleteAsync(client, again);
        Assert.Equal(HttpStatusCode.OK, signedIn.StatusCode);
    }

    [Fact]
    public async Task Given_a_Google_account_with_a_photo_When_the_account_is_created_Then_the_server_copies_the_photo_into_the_image_store_once()
    {
        using var client = Browser.CreateClient(factory);
        var picture = PhotoUrl("copied");
        factory.Google.Photos[picture] = Png;
        var external = await JoinAttemptAsync(client, new GoogleAccount { Email = "grace.join.google.photo@gmail.com", Picture = picture });

        using var response = await JoinAsync(client, external, Valid);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var memberId = Guid.Parse((await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("memberId").GetString()!);
        var member = await MemberAsync(memberId);
        var key = Assert.IsType<string>(member.PhotoKey);
        Assert.Matches("^[0-9a-f]{32}\\.png$", key);
        var stored = await factory.Images.OpenAsync(key, TestContext.Current.CancellationToken);
        Assert.NotNull(stored);
        Assert.Equal(1, factory.Google.PhotoFetches(picture));
    }

    [Theory]
    [InlineData("http://lh3.googleusercontent.com/a/plain-http")]
    [InlineData("https://photos.example.org/a/elsewhere")]
    [InlineData("https://googleusercontent.com.example.org/a/lookalike")]
    public async Task Given_a_photo_address_that_is_not_Google_s_When_the_account_is_created_Then_nothing_is_fetched_and_it_has_no_photo(string picture)
    {
        using var client = Browser.CreateClient(factory);
        factory.Google.Photos[picture] = Png;
        var external = await JoinAttemptAsync(client, new GoogleAccount { Email = $"grace.join.google.{Math.Abs(picture.GetHashCode(StringComparison.Ordinal))}@gmail.com", Picture = picture });

        using var response = await JoinAsync(client, external, Valid);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var memberId = Guid.Parse((await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("memberId").GetString()!);
        Assert.Null((await MemberAsync(memberId)).PhotoKey);
        Assert.Equal(0, factory.Google.PhotoFetches(picture));
    }

    [Fact]
    public async Task Given_a_photo_that_is_not_an_image_When_the_account_is_created_Then_it_is_created_without_a_photo()
    {
        using var client = Browser.CreateClient(factory);
        var picture = PhotoUrl("not-an-image");
        factory.Google.Photos[picture] = "<html>not an image</html>"u8.ToArray();
        var external = await JoinAttemptAsync(client, new GoogleAccount { Email = "grace.join.google.notimage@gmail.com", Picture = picture });

        using var response = await JoinAsync(client, external, Valid);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var memberId = Guid.Parse((await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("memberId").GetString()!);
        Assert.Null((await MemberAsync(memberId)).PhotoKey);
    }

    [Fact]
    public async Task Given_the_age_is_not_confirmed_When_the_visitor_submits_Then_it_is_refused_age_not_confirmed_and_the_Google_account_is_kept()
    {
        using var client = Browser.CreateClient(factory);
        var external = await JoinAttemptAsync(client, new GoogleAccount { Email = "grace.join.google.age@gmail.com" });

        using var response = await JoinAsync(client, external, new { fullName = "Grace Thompson", ageConfirmed = false });

        await AssertRefusedAsync(response, HttpStatusCode.BadRequest, "age_not_confirmed");
        Assert.Null(Browser.SetCookie(response, GoogleSignIn.ExternalCookieName));
        using var pending = await Browser.SendAsync(client, HttpMethod.Get, PendingPath, external);
        Assert.Equal(HttpStatusCode.OK, pending.StatusCode);
    }

    [Theory]
    [InlineData("", "fullName", "validation_failed")]
    [InlineData("   ", "fullName", "validation_failed")]
    public async Task Given_a_blank_name_When_the_visitor_submits_Then_it_names_the_field_and_creates_nothing(string name, string field, string code)
    {
        using var client = Browser.CreateClient(factory);
        var external = await JoinAttemptAsync(client, new GoogleAccount { Email = $"grace.join.google.blank{name.Length}@gmail.com" });

        using var response = await JoinAsync(client, external, new { fullName = name, ageConfirmed = true });

        var problem = await AssertRefusedAsync(response, HttpStatusCode.BadRequest, code);
        Assert.Equal(["Enter your name."], problem.GetProperty("errors").GetProperty(field).EnumerateArray().Select(e => e.GetString()));
    }

    [Fact]
    public async Task Given_a_name_over_100_characters_When_the_visitor_submits_Then_it_is_refused_field_too_long()
    {
        using var client = Browser.CreateClient(factory);
        var external = await JoinAttemptAsync(client, new GoogleAccount { Email = "grace.join.google.long@gmail.com" });

        using var response = await JoinAsync(client, external, new { fullName = new string('a', 101), ageConfirmed = true });

        await AssertRefusedAsync(response, HttpStatusCode.BadRequest, "field_too_long");
    }

    [Fact]
    public async Task Given_a_Google_account_whose_email_is_not_verified_When_the_visitor_submits_Then_nothing_is_created_and_it_is_forgotten()
    {
        using var client = Browser.CreateClient(factory);
        var external = await JoinAttemptAsync(client, new GoogleAccount { Email = "grace.join.google.unverified@gmail.com", EmailVerified = false });

        using var response = await JoinAsync(client, external, Valid);

        await AssertRefusedAsync(response, HttpStatusCode.Unauthorized, "google_email_unverified");
        Assert.Contains("expires=thu, 01 jan 1970 00:00:00 gmt", Browser.Attributes(Assert.IsType<string>(Browser.SetCookie(response, GoogleSignIn.ExternalCookieName))));
        Assert.False(await ExistsAsync("grace.join.google.unverified@gmail.com"));
    }

    [Fact]
    public async Task Given_the_Google_email_already_has_an_account_When_the_visitor_submits_Then_it_is_refused_email_taken_and_no_second_account_is_created()
    {
        using var client = Browser.CreateClient(factory);
        var external = await JoinAttemptAsync(client, new GoogleAccount { Email = "grace.join.google.taken@gmail.com" });
        await SignInTests.JoinAsync(client, "grace.join.google.taken@gmail.com");

        using var response = await JoinAsync(client, external, Valid);

        await AssertRefusedAsync(response, HttpStatusCode.Conflict, "email_taken");
    }

    [Fact]
    public async Task Given_5_accounts_created_from_one_network_this_hour_When_a_Google_join_is_submitted_Then_it_is_refused_rate_limited()
    {
        using var client = Browser.CreateClient(factory);
        var address = $"198.51.100.{Random.Shared.Next(1, 254)}";
        client.DefaultRequestHeaders.Add(ApiFactory.ClientAddressHeader, address);
        for (var i = 0; i < 5; i++)
        {
            await SignInTests.JoinAsync(client, $"grace.join.google.limit{i}@example.org");
        }

        var external = await JoinAttemptAsync(client, new GoogleAccount { Email = "grace.join.google.limited@gmail.com" });
        using var response = await JoinAsync(client, external, Valid);

        await AssertRefusedAsync(response, HttpStatusCode.TooManyRequests, "rate_limited");
        Assert.False(await ExistsAsync("grace.join.google.limited@gmail.com"));
    }

    [Fact]
    public async Task Given_finish_your_profile_When_the_visitor_chooses_Change_Then_the_Google_account_is_forgotten_at_once()
    {
        using var client = Browser.CreateClient(factory);
        var external = await JoinAttemptAsync(client, new GoogleAccount { Email = "grace.join.google.change@gmail.com" });

        using var response = await Browser.SendAsync(client, HttpMethod.Delete, PendingPath, external);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains("expires=thu, 01 jan 1970 00:00:00 gmt", Browser.Attributes(Assert.IsType<string>(Browser.SetCookie(response, GoogleSignIn.ExternalCookieName))));
    }

    private static readonly object Valid = new { fullName = "Grace Thompson", ageConfirmed = true };

    private static readonly string[] Running = ["running"];

    /// <summary>A tiny PNG: its first bytes are what the store checks.</summary>
    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 0x49, 0x48, 0x44, 0x52];

    private static string PhotoUrl(string name) => $"https://lh3.googleusercontent.com/a/{name}-{Guid.NewGuid():N}";

    private Task<string> JoinAttemptAsync(HttpClient client, GoogleAccount account) =>
        GoogleSignIn.ExternalCookieAsync(client, factory.Google, GoogleApp.Member, account, new { intent = "join" });

    private static async Task<HttpResponseMessage> JoinAsync(HttpClient client, string? cookie, object body)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(JoinPath, UriKind.Relative)) { Content = JsonContent.Create(body) };
        if (cookie is not null)
        {
            request.Headers.Add("Cookie", cookie);
        }

        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }

    private static async Task<HttpResponseMessage> CompleteAsync(HttpClient client, string cookie)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri("/api/session/google", UriKind.Relative)) { Content = JsonContent.Create(new { }) };
        request.Headers.Add("Cookie", cookie);
        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }

    private async Task<Member> MemberAsync(Guid id)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Members.AsNoTracking().SingleAsync(m => m.Id == id, TestContext.Current.CancellationToken);
    }

    private async Task<bool> ExistsAsync(string email)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var normalized = Member.NormalizeEmail(email);
        return await db.Members.AnyAsync(m => m.NormalizedEmail == normalized, TestContext.Current.CancellationToken);
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
