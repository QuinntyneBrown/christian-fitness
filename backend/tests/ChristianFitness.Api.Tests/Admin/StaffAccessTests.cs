using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>
/// L2-018 AC4 and AC6 (ADR 0010): an admin endpoint answers only a staff session; a visitor or a
/// member's session is refused with a status and no data. Staff who sign out end their session on
/// the server.
/// </summary>
public sealed class StaffAccessTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Given_no_session_When_an_admin_endpoint_is_asked_Then_it_is_refused_with_401_and_no_data()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", cookie: null);

        await AssertRefusedAsync(response, HttpStatusCode.Unauthorized, "unauthenticated");
    }

    [Fact]
    public async Task Given_a_member_session_When_an_admin_endpoint_is_asked_Then_it_is_refused_with_401_and_no_data()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "grace.access@example.org", role: null);
        using var signedIn = await Browser.SignInAsync(client, "grace.access@example.org", Staff.Password);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", Browser.SessionCookie(signedIn));

        await AssertRefusedAsync(response, HttpStatusCode.Unauthorized, "unauthenticated");
    }

    // A staff member's member session is not a staff session either: the admin app needs its own sign-in.
    [Fact]
    public async Task Given_staff_signed_in_to_the_member_app_only_When_an_admin_endpoint_is_asked_Then_it_is_refused_with_401()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.member.app@example.org", StaffRoleName.Admin);
        using var signedIn = await Browser.SignInAsync(client, "dana.member.app@example.org", Staff.Password);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", Browser.SessionCookie(signedIn));

        await AssertRefusedAsync(response, HttpStatusCode.Unauthorized, "unauthenticated");
    }

    // A role taken away after sign-in: the session's next read finds no role.
    [Fact]
    public async Task Given_staff_whose_role_was_removed_When_they_ask_for_the_staff_session_Then_it_is_refused_with_not_staff_and_403()
    {
        using var client = Browser.CreateClient(factory);
        var id = await Staff.CreateAsync(factory, client, "dana.removed@example.org", StaffRoleName.Moderator);
        using var signedIn = await Staff.SignInAsync(client, "dana.removed@example.org", Staff.Password);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.StaffRoles.Remove(await db.StaffRoles.SingleAsync(r => r.MemberId == Guid.Parse(id), TestContext.Current.CancellationToken));
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", Staff.Cookie(signedIn));

        await AssertRefusedAsync(response, HttpStatusCode.Forbidden, "not_staff");
    }

    [Fact]
    public async Task Given_signed_in_staff_When_they_sign_out_Then_it_answers_204_expires_the_cookie_and_the_cookie_opens_nothing_afterwards()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.signout@example.org", StaffRoleName.Admin);
        using var signedIn = await Staff.SignInAsync(client, "dana.signout@example.org", Staff.Password);
        var cookie = Staff.Cookie(signedIn);

        using var signedOut = await Browser.SendAsync(client, HttpMethod.Delete, "/api/admin/session", cookie);

        Assert.Equal(HttpStatusCode.NoContent, signedOut.StatusCode);
        var attributes = Browser.Attributes(Assert.IsType<string>(Staff.SetCookie(signedOut)));
        Assert.Contains("expires=thu, 01 jan 1970 00:00:00 gmt", attributes);
        using var replayed = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", cookie);
        await AssertRefusedAsync(replayed, HttpStatusCode.Unauthorized, "unauthenticated");
    }

    [Fact]
    public async Task Given_no_session_When_signing_out_of_the_admin_app_Then_it_is_refused_with_401()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Delete, "/api/admin/session", cookie: null);

        await AssertRefusedAsync(response, HttpStatusCode.Unauthorized, "unauthenticated");
    }

    private static async Task AssertRefusedAsync(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["code", "status", "title", "traceId", "type"], problem.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(code, problem.GetProperty("code").GetString());
    }
}
