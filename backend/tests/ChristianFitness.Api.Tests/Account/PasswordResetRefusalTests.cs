using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using static ChristianFitness.Api.Tests.Account.PasswordResetCompleteTests;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-045 AC2, AC4 and AC5: an unknown, used or expired link, or none at all, is refused 410 with
/// <c>reset_link_expired</c> and changes nothing; saving spends the link and every other unused link
/// of the account; a password shorter than 8 characters is refused 400 <c>validation_failed</c>.
/// </summary>
public sealed class PasswordResetRefusalTests(PasswordResetCompleteTests.Factory factory)
    : IClassFixture<PasswordResetCompleteTests.Factory>
{
    public static TheoryData<string, string?> UnknownTokens() => new()
    {
        // why, token
        { "a token no link holds", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
        { "a blank token", string.Empty },
        { "no token at all", null },
    };

    [Theory]
    [MemberData(nameof(UnknownTokens))]
    public async Task Given_an_unknown_token_When_it_is_checked_Then_it_is_refused_with_reset_link_expired(string why, string? token)
    {
        _ = why;
        using var client = Browser.CreateClient(factory);

        using var response = await CheckAsync(client, token);

        await AssertExpiredAsync(response);
    }

    [Theory]
    [MemberData(nameof(UnknownTokens))]
    public async Task Given_an_unknown_token_When_a_password_is_saved_with_it_Then_it_is_refused_with_reset_link_expired(string why, string? token)
    {
        _ = why;
        using var client = Browser.CreateClient(factory);

        using var response = await CompleteAsync(client, token, NewPassword);

        await AssertExpiredAsync(response);
    }

    // The fixture's clock only moves forward, so each test that moves it comes after its own link.
    [Fact]
    public async Task Given_a_link_requested_30_minutes_ago_When_it_is_checked_or_used_Then_it_is_refused_and_the_password_stays()
    {
        using var client = Browser.CreateClient(factory);
        var token = await LinkForAsync(factory, client, "grace.refusal.expired@example.org");
        factory.Time.Advance(TimeSpan.FromMinutes(30));

        using var checkedLink = await CheckAsync(client, token);
        using var saved = await CompleteAsync(client, token, NewPassword);

        await AssertExpiredAsync(checkedLink);
        await AssertExpiredAsync(saved);
        await AssertPasswordAsync(client, "grace.refusal.expired@example.org", OldPassword);
    }

    [Fact]
    public async Task Given_a_link_one_second_short_of_30_minutes_When_it_is_used_Then_it_sets_the_password()
    {
        using var client = Browser.CreateClient(factory);
        var token = await LinkForAsync(factory, client, "grace.refusal.inside@example.org");
        factory.Time.Advance(TimeSpan.FromMinutes(30) - TimeSpan.FromSeconds(1));

        using var saved = await CompleteAsync(client, token, NewPassword);

        Assert.Equal(HttpStatusCode.NoContent, saved.StatusCode);
    }

    [Fact]
    public async Task Given_a_link_that_set_a_password_When_it_is_checked_or_used_again_Then_it_is_refused_and_the_password_stays()
    {
        using var client = Browser.CreateClient(factory);
        var token = await LinkForAsync(factory, client, "grace.refusal.used@example.org");
        using (var first = await CompleteAsync(client, token, NewPassword))
        {
            Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        }

        using var checkedLink = await CheckAsync(client, token);
        using var again = await CompleteAsync(client, token, "anotherpassword");

        await AssertExpiredAsync(checkedLink);
        await AssertExpiredAsync(again);
        await AssertPasswordAsync(client, "grace.refusal.used@example.org", NewPassword);
    }

    [Fact]
    public async Task Given_two_links_for_one_account_When_one_sets_a_password_Then_the_other_stops_working()
    {
        using var client = Browser.CreateClient(factory);
        var older = await LinkForAsync(factory, client, "grace.refusal.other@example.org");
        var newer = await NewLinkAsync(factory, client, "grace.refusal.other@example.org");
        using (var saved = await CompleteAsync(client, newer, NewPassword))
        {
            Assert.Equal(HttpStatusCode.NoContent, saved.StatusCode);
        }

        using var response = await CompleteAsync(client, older, "anotherpassword");

        await AssertExpiredAsync(response);
        await AssertPasswordAsync(client, "grace.refusal.other@example.org", NewPassword);
    }

    [Fact]
    public async Task Given_another_member_link_When_one_member_sets_a_password_Then_the_other_member_link_still_works()
    {
        using var client = Browser.CreateClient(factory);
        var mine = await LinkForAsync(factory, client, "grace.refusal.mine@example.org");
        var theirs = await LinkForAsync(factory, client, "grace.refusal.theirs@example.org");
        using (var saved = await CompleteAsync(client, mine, NewPassword))
        {
            Assert.Equal(HttpStatusCode.NoContent, saved.StatusCode);
        }

        using var response = await CheckAsync(client, theirs);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    public static TheoryData<string, string?> ShortPasswords() => new()
    {
        // why, password
        { "seven characters", "1234567" },
        { "blank", string.Empty },
        { "missing", null },
    };

    [Theory]
    [MemberData(nameof(ShortPasswords))]
    public async Task Given_a_password_shorter_than_8_characters_When_it_is_saved_Then_it_is_refused_with_validation_failed_and_the_link_still_works(string why, string? password)
    {
        _ = why;
        using var client = Browser.CreateClient(factory);
        var email = $"grace.refusal.short.{why.Replace(' ', '.')}@example.org";
        var token = await LinkForAsync(factory, client, email);

        using var response = await CompleteAsync(client, token, password);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal(["Use at least 8 characters"], problem.GetProperty("errors").GetProperty("password").EnumerateArray().Select(e => e.GetString()));
        using var checkedLink = await CheckAsync(client, token);
        Assert.Equal(HttpStatusCode.OK, checkedLink.StatusCode);
        await AssertPasswordAsync(client, email, OldPassword);
    }

    [Fact]
    public async Task Given_a_password_of_exactly_8_characters_When_it_is_saved_Then_it_is_set()
    {
        using var client = Browser.CreateClient(factory);
        var token = await LinkForAsync(factory, client, "grace.refusal.eight@example.org");

        using var response = await CompleteAsync(client, token, "12345678");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await AssertPasswordAsync(client, "grace.refusal.eight@example.org", "12345678");
    }

    private static async Task AssertExpiredAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.Gone, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("reset_link_expired", problem.GetProperty("code").GetString());
        Assert.False(problem.TryGetProperty("email", out _));
    }

    /// <summary>Only <paramref name="password"/> signs <paramref name="email"/> in, of the passwords the tests use.</summary>
    private static async Task AssertPasswordAsync(HttpClient client, string email, string password)
    {
        foreach (var tried in new[] { OldPassword, NewPassword, "anotherpassword", "12345678" })
        {
            using var signIn = await Browser.SignInAsync(client, email, tried);
            Assert.Equal(tried == password ? HttpStatusCode.OK : HttpStatusCode.Unauthorized, signIn.StatusCode);
        }
    }
}
