using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Members;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>
/// L2-046 AC1 and AC2 (ADR 0013): the password step answers 202 with a pending sign-in and no staff
/// session; the authenticator's code, within 5 minutes, starts the staff session.
/// </summary>
public sealed class TwoStepTests(TwoStepTests.Factory factory) : IClassFixture<TwoStepTests.Factory>
{
    /// <summary>The API with a clock the tests move (AGENTS.md: never sleep).</summary>
    public sealed class Factory : ApiFactory
    {
        public FakeTimeProvider Time { get; } = new(new DateTimeOffset(2026, 11, 23, 9, 0, 10, TimeSpan.Zero));

        protected override void ConfigureServices(IServiceCollection services)
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Time);
        }
    }

    [Fact]
    public async Task Given_staff_with_two_step_set_up_When_they_give_the_right_password_Then_it_answers_202_with_a_step_cookie_and_no_session()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.step@example.org", StaffRoleName.Admin);
        var now = factory.Time.GetUtcNow();

        using var response = await Staff.SignInAsync(client, "dana.step@example.org", Staff.Password);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
        Assert.Null(Staff.SetCookie(response));
        Assert.Null(Browser.SessionSetCookie(response));
        var attributes = Browser.Attributes(Assert.IsType<string>(Staff.StepSetCookie(response)));
        Assert.Contains("secure", attributes);
        Assert.Contains("httponly", attributes);
        Assert.Contains("samesite=strict", attributes);
        Assert.Contains("path=/", attributes);
        Assert.DoesNotContain(attributes, a => a.StartsWith("domain=", StringComparison.Ordinal));
        Assert.Contains($"expires={now.AddMinutes(5).ToString("R", CultureInfo.InvariantCulture).ToLowerInvariant()}", attributes);
        Assert.Matches("^__Host-cf-admin-step=[A-Za-z0-9_-]{43}$", Staff.StepCookie(response));
    }

    [Fact]
    public async Task Given_the_password_step_When_the_authenticator_s_code_is_sent_with_the_step_cookie_Then_the_staff_session_starts()
    {
        using var client = Browser.CreateClient(factory);
        var memberId = await Staff.CreateAsync(factory, client, "dana.code@example.org", StaffRoleName.Moderator);
        using var passwordStep = await Staff.SignInAsync(client, "dana.code@example.org", Staff.Password);
        factory.Time.Advance(TimeSpan.FromMinutes(4));

        using var response = await Staff.VerifyAsync(client, Staff.StepCookie(passwordStep), Staff.CodeAt(factory.Time.GetUtcNow()));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var session = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["memberId", "name", "role"], session.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(memberId, session.GetProperty("memberId").GetString());
        Assert.Equal("Grace Thompson", session.GetProperty("name").GetString());
        Assert.Equal("Moderator", session.GetProperty("role").GetString());
        Assert.Contains("expires=thu, 01 jan 1970 00:00:00 gmt", Browser.Attributes(Assert.IsType<string>(Staff.StepSetCookie(response))));
        using var next = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", Staff.Cookie(response));
        Assert.Equal(HttpStatusCode.OK, next.StatusCode);
    }

    [Theory]
    [InlineData("the step before", -30)]
    [InlineData("the step after", 30)]
    public async Task Given_the_password_step_When_a_neighbouring_step_s_code_is_sent_with_spaces_Then_the_staff_session_starts(string why, int seconds)
    {
        Assert.NotNull(why);
        using var client = Browser.CreateClient(factory);
        var email = $"dana.drift{seconds + 100}@example.org";
        await Staff.CreateAsync(factory, client, email, StaffRoleName.Admin);
        using var passwordStep = await Staff.SignInAsync(client, email, Staff.Password);
        var code = Staff.CodeAt(factory.Time.GetUtcNow().AddSeconds(seconds));

        using var response = await Staff.VerifyAsync(client, Staff.StepCookie(passwordStep), $"{code[..3]} {code[3..]}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(Staff.SetCookie(response));
    }
}
