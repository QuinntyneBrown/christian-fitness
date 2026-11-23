using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Sessions;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>
/// L2-018 AC3 with L2-004 AC3 (ADR 0016): 5 failed sign-ins for one email within 15 minutes, in
/// the admin app or the member app, refuse the next staff sign-in with <c>too_many_attempts</c>
/// and 429, right password or not, until the window passes. The clock is a
/// <see cref="Microsoft.Extensions.Time.Testing.FakeTimeProvider"/> shared by the class: each
/// test uses its own email and moves the clock only forward.
/// </summary>
public sealed class StaffSignInLockoutTests(ProtectionsApiFactory factory) : IClassFixture<ProtectionsApiFactory>
{
    private const string Wrong = "not-her-password";

    [Fact]
    public async Task Given_5_failed_staff_sign_ins_within_15_minutes_When_a_sixth_has_the_right_password_Then_it_is_refused_with_too_many_attempts()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.lockout@example.org", StaffRoleName.Admin);
        await FailStaffAsync(client, "dana.lockout@example.org", 5, TimeSpan.FromMinutes(2));

        using var response = await Staff.SignInAsync(client, "dana.lockout@example.org", Staff.Password);

        await AssertPausedAsync(response);
    }

    // One account, one count: failures in the member app pause the admin app too.
    [Fact]
    public async Task Given_5_failed_member_sign_ins_for_a_staff_email_When_staff_sign_in_Then_it_is_refused_with_too_many_attempts()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.both@example.org", StaffRoleName.Admin);
        for (var i = 0; i < 5; i++)
        {
            using var failed = await Browser.SignInAsync(client, "dana.both@example.org", Wrong);
            Assert.Equal(HttpStatusCode.Unauthorized, failed.StatusCode);
        }

        using var response = await Staff.SignInAsync(client, "dana.both@example.org", Staff.Password);

        await AssertPausedAsync(response);
    }

    [Fact]
    public async Task Given_5_failed_staff_sign_ins_When_the_member_app_is_signed_in_to_Then_it_is_refused_with_too_many_attempts()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.member.paused@example.org", StaffRoleName.Admin);
        await FailStaffAsync(client, "dana.member.paused@example.org", 5, TimeSpan.Zero);

        using var response = await Browser.SignInAsync(client, "dana.member.paused@example.org", Staff.Password);

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
    }

    [Fact]
    public async Task Given_5_failed_staff_sign_ins_a_minute_apart_When_the_first_is_15_minutes_old_Then_staff_sign_in_again()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.window@example.org", StaffRoleName.Admin);
        await FailStaffAsync(client, "dana.window@example.org", 5, TimeSpan.FromMinutes(1));

        factory.Time.Advance(TimeSpan.FromMinutes(10));
        using var stillPaused = await Staff.SignInAsync(client, "dana.window@example.org", Staff.Password);
        await AssertPausedAsync(stillPaused);

        factory.Time.Advance(TimeSpan.FromMinutes(1));
        using var response = await Staff.SignInAsync(client, "dana.window@example.org", Staff.Password);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    // A password step that starts a pending sign-in forgets the email's failures.
    [Fact]
    public async Task Given_4_failures_then_a_right_password_When_4_more_fail_Then_the_next_staff_sign_in_is_accepted()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.reset@example.org", StaffRoleName.Admin);
        await FailStaffAsync(client, "dana.reset@example.org", 4, TimeSpan.Zero);
        using (var accepted = await Staff.SignInAsync(client, "dana.reset@example.org", Staff.Password))
        {
            Assert.Equal(HttpStatusCode.Accepted, accepted.StatusCode);
        }

        await FailStaffAsync(client, "dana.reset@example.org", 4, TimeSpan.Zero);

        using var response = await Staff.SignInAsync(client, "dana.reset@example.org", Staff.Password);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    /// <summary>Fails <paramref name="count"/> staff sign-ins for the email, moving the clock <paramref name="apart"/> before each.</summary>
    private async Task FailStaffAsync(HttpClient client, string email, int count, TimeSpan apart)
    {
        for (var i = 0; i < count; i++)
        {
            factory.Time.Advance(apart);
            using var failed = await Staff.SignInAsync(client, email, Wrong);
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
        Assert.Null(Staff.StepSetCookie(response));
    }
}
