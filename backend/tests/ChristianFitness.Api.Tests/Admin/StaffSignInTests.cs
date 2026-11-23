using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>
/// L2-018 AC1 to AC3 (ADR 0011, ADR 0013): staff sign in to the admin app, password then code
/// (L2-046), with their own session cookie; a member without a staff role is refused with
/// <c>not_staff</c> and 403; wrong credentials get the one generic refusal sign-in gives everyone.
/// </summary>
public sealed class StaffSignInTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Theory]
    [InlineData(StaffRoleName.Admin, "Admin")]
    [InlineData(StaffRoleName.Moderator, "Moderator")]
    public async Task Given_a_staff_account_When_it_signs_in_to_the_admin_app_with_its_code_Then_the_staff_session_is_answered(StaffRoleName role, string expectedRole)
    {
        using var client = Browser.CreateClient(factory);
        var email = $"dana.{expectedRole.ToUpperInvariant()}@example.org";
        var memberId = await Staff.CreateAsync(factory, client, email, role);

        using var response = await Staff.SignInWithCodeAsync(client, email);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var session = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["memberId", "name", "role"], session.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(memberId, session.GetProperty("memberId").GetString());
        Assert.Equal("Grace Thompson", session.GetProperty("name").GetString());
        Assert.Equal(expectedRole, session.GetProperty("role").GetString());
    }

    [Fact]
    public async Task Given_a_staff_account_When_it_signs_in_Then_the_staff_cookie_is_secure_http_only_strict_host_prefixed_and_ends_with_the_browser()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.cookie@example.org", StaffRoleName.Admin);

        using var response = await Staff.SignInWithCodeAsync(client, "dana.cookie@example.org");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var attributes = Browser.Attributes(Assert.IsType<string>(Staff.SetCookie(response)));
        Assert.Contains("secure", attributes);
        Assert.Contains("httponly", attributes);
        Assert.Contains("samesite=strict", attributes);
        Assert.Contains("path=/", attributes);
        Assert.DoesNotContain(attributes, a => a.StartsWith("domain=", StringComparison.Ordinal));
        Assert.DoesNotContain(attributes, a => a.StartsWith("expires=", StringComparison.Ordinal) || a.StartsWith("max-age=", StringComparison.Ordinal));
        Assert.Null(Browser.SessionSetCookie(response));
    }

    [Fact]
    public async Task Given_staff_who_signed_in_When_they_ask_for_the_staff_session_with_the_cookie_Then_it_answers_who_they_are()
    {
        using var client = Browser.CreateClient(factory);
        var memberId = await Staff.CreateAsync(factory, client, "dana.next@example.org", StaffRoleName.Admin);
        using var signedIn = await Staff.SignInWithCodeAsync(client, "dana.next@example.org");

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", Staff.Cookie(signedIn));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var session = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(memberId, session.GetProperty("memberId").GetString());
        Assert.Equal("Admin", session.GetProperty("role").GetString());
    }

    [Fact]
    public async Task Given_a_member_without_a_staff_role_When_they_sign_in_to_the_admin_app_Then_it_is_refused_with_not_staff_and_403()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "grace.member@example.org", role: null);

        using var response = await Staff.SignInAsync(client, "grace.member@example.org", Staff.Password);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["code", "status", "title", "traceId", "type"], problem.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("not_staff", problem.GetProperty("code").GetString());
        Assert.Null(Staff.SetCookie(response));
        Assert.Null(Staff.StepSetCookie(response));
        Assert.Null(Browser.SessionSetCookie(response));
    }

    [Theory]
    [InlineData("dana.refused@example.org", "abundantlifE")]
    [InlineData("nobody.staff@example.org", Staff.Password)]
    [InlineData("dana.refused@example.org", "")]
    [InlineData("", Staff.Password)]
    public async Task Given_wrong_credentials_When_signing_in_to_the_admin_app_Then_it_is_refused_with_invalid_credentials(string email, string password)
    {
        using var client = Browser.CreateClient(factory);
        await CreateOnceAsync(client, "dana.refused@example.org");

        using var response = await Staff.SignInAsync(client, email, password);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["code", "status", "title", "traceId", "type"], problem.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("invalid_credentials", problem.GetProperty("code").GetString());
        Assert.Null(Staff.SetCookie(response));
        Assert.Null(Staff.StepSetCookie(response));
    }

    // L2-018 AC3: a member's wrong password and a staff member's get the same answer, so the
    // refusal does not say whether the account is staff.
    [Fact]
    public async Task Given_a_member_and_a_staff_account_When_each_signs_in_with_a_wrong_password_Then_the_answers_are_the_same()
    {
        using var client = Browser.CreateClient(factory);
        await CreateOnceAsync(client, "dana.refused@example.org");
        await Staff.CreateAsync(factory, client, "grace.same.staff@example.org", role: null);

        using var staff = await Staff.SignInAsync(client, "dana.refused@example.org", "not-her-password");
        using var member = await Staff.SignInAsync(client, "grace.same.staff@example.org", "not-her-password");

        Assert.Equal(HttpStatusCode.Unauthorized, staff.StatusCode);
        Assert.Equal(staff.StatusCode, member.StatusCode);
        Assert.Equal(await WithoutTraceIdAsync(staff), await WithoutTraceIdAsync(member));
    }

    private static async Task<string[]> WithoutTraceIdAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return [.. body.EnumerateObject().Where(p => p.Name != "traceId").Select(p => $"{p.Name}={p.Value}")];
    }

    private static readonly SemaphoreSlim Creating = new(1, 1);
    private static readonly HashSet<string> Created = new(StringComparer.Ordinal);

    /// <summary>Creates one Admin per email for the class: the theories share it.</summary>
    private async Task CreateOnceAsync(HttpClient client, string email)
    {
        await Creating.WaitAsync(TestContext.Current.CancellationToken);
        try
        {
            if (Created.Add(email))
            {
                await Staff.CreateAsync(factory, client, email, StaffRoleName.Admin);
            }
        }
        finally
        {
            Creating.Release();
        }
    }
}
