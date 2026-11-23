using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>
/// L2-046 AC3 to AC6 (ADR 0012): a wrong, malformed or used code is refused with
/// <c>invalid_code</c>; after 5 wrong codes in 15 minutes every code is refused with
/// <c>too_many_attempts</c> until the window passes; a code with no pending sign-in, or after 5
/// minutes, is refused with <c>two_step_expired</c>; staff without two-step set up are refused at
/// the password step. The clock is moved, never slept on.
/// </summary>
public sealed class TwoStepRefusalTests(TwoStepTests.Factory factory) : IClassFixture<TwoStepTests.Factory>
{
    private DateTimeOffset Now => factory.Time.GetUtcNow();

    [Theory]
    [InlineData("a wrong code", "wrong")]
    [InlineData("letters", "abcdef")]
    [InlineData("five digits", "12345")]
    [InlineData("blank", "")]
    [InlineData("missing", null)]
    public async Task Given_the_password_step_When_a_wrong_or_malformed_code_is_sent_Then_it_is_refused_with_invalid_code_and_the_pending_sign_in_stays(string why, string? code)
    {
        using var client = Browser.CreateClient(factory);
        var email = $"dana.wrong.{Guid.NewGuid():N}@example.org";
        await Staff.CreateAsync(factory, client, email, StaffRoleName.Admin);
        using var passwordStep = await Staff.SignInAsync(client, email, Staff.Password);
        var cookie = Staff.StepCookie(passwordStep);

        using var response = await Staff.VerifyAsync(client, cookie, code == "wrong" ? WrongCode(Now) : code);

        await AssertRefusedAsync(response, HttpStatusCode.Unauthorized, "invalid_code");
        Assert.Null(Staff.SetCookie(response));
        Assert.Null(Staff.StepSetCookie(response));
        using var retried = await Staff.VerifyAsync(client, cookie, Staff.CodeAt(Now));
        Assert.Equal(HttpStatusCode.OK, retried.StatusCode);
        Assert.NotNull(why);
    }

    [Fact]
    public async Task Given_a_code_that_opened_a_session_When_it_is_sent_again_after_a_new_password_step_Then_it_is_refused_with_invalid_code()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.reuse@example.org", StaffRoleName.Admin);
        var code = Staff.CodeAt(Now);
        using var first = await Staff.SignInAsync(client, "dana.reuse@example.org", Staff.Password);
        using var opened = await Staff.VerifyAsync(client, Staff.StepCookie(first), code);
        Assert.Equal(HttpStatusCode.OK, opened.StatusCode);
        using var second = await Staff.SignInAsync(client, "dana.reuse@example.org", Staff.Password);

        using var response = await Staff.VerifyAsync(client, Staff.StepCookie(second), code);

        await AssertRefusedAsync(response, HttpStatusCode.Unauthorized, "invalid_code");
        Assert.Null(Staff.SetCookie(response));
    }

    [Fact]
    public async Task Given_5_minutes_since_the_password_step_When_the_right_code_is_sent_Then_it_is_refused_with_two_step_expired_and_the_step_cookie_ends()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.late@example.org", StaffRoleName.Admin);
        using var passwordStep = await Staff.SignInAsync(client, "dana.late@example.org", Staff.Password);
        var cookie = Staff.StepCookie(passwordStep);
        factory.Time.Advance(TimeSpan.FromMinutes(5));

        using var response = await Staff.VerifyAsync(client, cookie, Staff.CodeAt(Now));

        await AssertRefusedAsync(response, HttpStatusCode.Unauthorized, "two_step_expired");
        Assert.Null(Staff.SetCookie(response));
        Assert.Contains("expires=thu, 01 jan 1970 00:00:00 gmt", Browser.Attributes(Assert.IsType<string>(Staff.StepSetCookie(response))));
        using var again = await Staff.VerifyAsync(client, cookie, Staff.CodeAt(Now));
        await AssertRefusedAsync(again, HttpStatusCode.Unauthorized, "two_step_expired");
    }

    [Theory]
    [InlineData("no step cookie", null)]
    [InlineData("a step cookie no challenge has", "__Host-cf-admin-step=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    public async Task Given_no_pending_sign_in_When_a_code_is_sent_Then_it_is_refused_with_two_step_expired(string why, string? cookie)
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Staff.VerifyAsync(client, cookie, Staff.CodeAt(Now));

        await AssertRefusedAsync(response, HttpStatusCode.Unauthorized, "two_step_expired");
        Assert.Null(Staff.SetCookie(response));
        Assert.NotNull(why);
    }

    [Fact]
    public async Task Given_5_wrong_codes_in_15_minutes_When_the_right_code_is_sent_Then_it_is_refused_with_too_many_attempts_until_the_window_passes()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.locked@example.org", StaffRoleName.Admin);
        using var passwordStep = await Staff.SignInAsync(client, "dana.locked@example.org", Staff.Password);
        var cookie = Staff.StepCookie(passwordStep);
        for (var attempt = 1; attempt <= 5; attempt++)
        {
            using var wrong = await Staff.VerifyAsync(client, cookie, WrongCode(Now));
            await AssertRefusedAsync(wrong, HttpStatusCode.Unauthorized, "invalid_code");
            factory.Time.Advance(TimeSpan.FromSeconds(10));
        }

        using var response = await Staff.VerifyAsync(client, cookie, Staff.CodeAt(Now));

        var problem = await AssertRefusedAsync(response, (HttpStatusCode)429, "too_many_attempts");
        Assert.Equal("https://tools.ietf.org/html/rfc6585#section-4", problem.GetProperty("type").GetString());
        Assert.Null(Staff.SetCookie(response));
        Assert.Contains("expires=thu, 01 jan 1970 00:00:00 gmt", Browser.Attributes(Assert.IsType<string>(Staff.StepSetCookie(response))));
        // The pending sign-in has ended.
        using var ended = await Staff.VerifyAsync(client, cookie, Staff.CodeAt(Now));
        await AssertRefusedAsync(ended, HttpStatusCode.Unauthorized, "two_step_expired");
        // Signing in again does not reset the count: it is the account's.
        using var again = await Staff.SignInAsync(client, "dana.locked@example.org", Staff.Password);
        using var stillLocked = await Staff.VerifyAsync(client, Staff.StepCookie(again), Staff.CodeAt(Now));
        await AssertRefusedAsync(stillLocked, (HttpStatusCode)429, "too_many_attempts");
        // The first failure was 50 seconds ago; 15 minutes after it, it no longer counts.
        factory.Time.Advance(TimeSpan.FromMinutes(15) - TimeSpan.FromSeconds(50));
        using var afterWindow = await Staff.SignInAsync(client, "dana.locked@example.org", Staff.Password);
        using var opened = await Staff.VerifyAsync(client, Staff.StepCookie(afterWindow), Staff.CodeAt(Now));
        Assert.Equal(HttpStatusCode.OK, opened.StatusCode);
    }

    [Fact]
    public async Task Given_staff_without_two_step_set_up_When_they_give_the_right_password_Then_it_is_refused_with_two_step_not_set_up_and_no_cookie()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "lee.unset@example.org", StaffRoleName.Admin, twoStep: false);

        using var response = await Staff.SignInAsync(client, "lee.unset@example.org", Staff.Password);

        await AssertRefusedAsync(response, HttpStatusCode.Forbidden, "two_step_not_set_up");
        Assert.Null(Staff.SetCookie(response));
        Assert.Null(Staff.StepSetCookie(response));
        Assert.Null(Browser.SessionSetCookie(response));
    }

    /// <summary>A code that matches no step near <paramref name="now"/>: the right one with its last digit moved on.</summary>
    private static string WrongCode(DateTimeOffset now)
    {
        var step = Totp.StepAt(now);
        var near = new[] { step - 1, step, step + 1 }.Select(s => Totp.CodeAt(Staff.Secret, s)).ToHashSet(StringComparer.Ordinal);
        var code = Staff.CodeAt(now);
        for (var digit = 1; digit < 10; digit++)
        {
            var candidate = code[..5] + (char)('0' + ((code[5] - '0' + digit) % 10));
            if (!near.Contains(candidate))
            {
                return candidate;
            }
        }

        throw new InvalidOperationException("No wrong code found.");
    }

    private static async Task<JsonElement> AssertRefusedAsync(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["code", "status", "title", "traceId", "type"], problem.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(code, problem.GetProperty("code").GetString());
        return problem;
    }
}
