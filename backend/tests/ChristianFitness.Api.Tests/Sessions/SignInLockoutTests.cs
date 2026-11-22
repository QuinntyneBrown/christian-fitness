using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ChristianFitness.Api.Tests.Sessions;

/// <summary>
/// L2-004 AC3: 5 failed sign-ins for one email within 15 minutes refuse a sixth with code
/// <c>too_many_attempts</c> and HTTP 429 until the window passes (ADR 0010). The clock is a
/// <see cref="Microsoft.Extensions.Time.Testing.FakeTimeProvider"/> shared by the class: each test
/// uses its own email and moves the clock only forward.
/// </summary>
public sealed class SignInLockoutTests(ProtectionsApiFactory factory) : IClassFixture<ProtectionsApiFactory>
{
    private const string Password = "abundantlife";
    private const string Wrong = "not-her-password";

    [Fact]
    public async Task Given_5_failed_sign_ins_within_15_minutes_When_a_sixth_is_attempted_with_the_right_password_Then_it_is_refused_with_too_many_attempts()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "grace.lockout@example.org");
        await FailAsync(client, "grace.lockout@example.org", 5, TimeSpan.FromMinutes(2));

        using var response = await Browser.SignInAsync(client, "grace.lockout@example.org", Password);

        await AssertPausedAsync(response);
    }

    [Fact]
    public async Task Given_4_failed_sign_ins_When_the_fifth_attempt_has_the_right_password_Then_the_member_signs_in()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "grace.four@example.org");
        await FailAsync(client, "grace.four@example.org", 4, TimeSpan.FromMinutes(1));

        using var response = await Browser.SignInAsync(client, "grace.four@example.org", Password);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(Browser.SessionSetCookie(response));
    }

    [Fact]
    public async Task Given_5_failed_sign_ins_a_minute_apart_When_the_first_is_15_minutes_old_Then_the_member_signs_in_again()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "grace.window@example.org");
        await FailAsync(client, "grace.window@example.org", 5, TimeSpan.FromMinutes(1));

        // The window slides over the last 15 minutes. 14 minutes after the first failure all
        // five are inside it; at 15 minutes the first has left, and four do not pause.
        factory.Time.Advance(TimeSpan.FromMinutes(10));
        using var stillPaused = await Browser.SignInAsync(client, "grace.window@example.org", Password);
        await AssertPausedAsync(stillPaused);

        factory.Time.Advance(TimeSpan.FromMinutes(1));
        using var response = await Browser.SignInAsync(client, "grace.window@example.org", Password);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_paused_email_When_attempts_go_on_during_the_pause_Then_they_do_not_lengthen_it()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "grace.pause@example.org");
        await FailAsync(client, "grace.pause@example.org", 5, TimeSpan.Zero);

        for (var minute = 0; minute < 14; minute++)
        {
            factory.Time.Advance(TimeSpan.FromMinutes(1));
            using var refused = await Browser.SignInAsync(client, "grace.pause@example.org", Wrong);
            await AssertPausedAsync(refused);
        }

        factory.Time.Advance(TimeSpan.FromMinutes(1));
        using var response = await Browser.SignInAsync(client, "grace.pause@example.org", Password);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // The pause must not say whether an account has the email: an unknown email is paused too.
    [Fact]
    public async Task Given_5_failed_sign_ins_for_an_unknown_email_When_a_sixth_is_attempted_Then_it_is_refused_with_too_many_attempts()
    {
        using var client = Browser.CreateClient(factory);
        await FailAsync(client, "nobody.lockout@example.org", 5, TimeSpan.Zero);

        using var response = await Browser.SignInAsync(client, "nobody.lockout@example.org", Password);

        await AssertPausedAsync(response);
    }

    // The email is the account's lookup key, so another case or spaces are the same email.
    [Fact]
    public async Task Given_failures_with_the_email_in_other_cases_When_a_sixth_is_attempted_Then_they_all_counted()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "grace.cases@example.org");
        foreach (var email in new[] { "Grace.Cases@example.org", "GRACE.CASES@EXAMPLE.ORG", " grace.cases@example.org", "grace.cases@Example.org", "grace.cases@example.org " })
        {
            using var failed = await Browser.SignInAsync(client, email, Wrong);
            Assert.Equal(HttpStatusCode.Unauthorized, failed.StatusCode);
        }

        using var response = await Browser.SignInAsync(client, "grace.cases@example.org", Password);

        await AssertPausedAsync(response);
    }

    [Fact]
    public async Task Given_5_failures_for_one_email_When_another_member_signs_in_Then_they_are_not_paused()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "grace.other@example.org");
        await FailAsync(client, "someone.else@example.org", 5, TimeSpan.Zero);

        using var response = await Browser.SignInAsync(client, "grace.other@example.org", Password);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Given_4_failures_then_a_sign_in_When_4_more_fail_Then_the_next_attempt_still_signs_in()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, "grace.reset@example.org");
        await FailAsync(client, "grace.reset@example.org", 4, TimeSpan.Zero);
        using var signedIn = await Browser.SignInAsync(client, "grace.reset@example.org", Password);
        Assert.Equal(HttpStatusCode.OK, signedIn.StatusCode);
        await FailAsync(client, "grace.reset@example.org", 4, TimeSpan.Zero);

        using var response = await Browser.SignInAsync(client, "grace.reset@example.org", Password);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    /// <summary>Fails <paramref name="count"/> sign-ins for the email, moving the clock <paramref name="apart"/> before each.</summary>
    private async Task FailAsync(HttpClient client, string email, int count, TimeSpan apart)
    {
        for (var i = 0; i < count; i++)
        {
            factory.Time.Advance(apart);
            using var failed = await Browser.SignInAsync(client, email, Wrong);
            Assert.Equal(HttpStatusCode.Unauthorized, failed.StatusCode);
        }
    }

    private static async Task AssertPausedAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["code", "status", "title", "traceId", "type"], problem.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("too_many_attempts", problem.GetProperty("code").GetString());
        Assert.Equal(429, problem.GetProperty("status").GetInt32());
        Assert.Null(Browser.SessionSetCookie(response));
    }
}
