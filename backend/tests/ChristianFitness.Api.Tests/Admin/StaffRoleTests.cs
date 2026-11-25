using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>
/// L2-019 AC1 and AC2 (ADR 0020, ADR 0091): a Moderator may use the staff session, the Dashboard, Members and Event series,
/// and is refused every Events, Services and Stories endpoint, and any admin endpoint in no area yet, with
/// 403 and <c>forbidden_role</c>; an Admin may use them all. Events and Members are asked through
/// their real lists (slices 10.1 and 26.1); the areas without an endpoint yet through the probes of
/// <see cref="StaffRolesApiFactory"/>.
/// </summary>
public sealed class StaffRoleTests(StaffRolesApiFactory factory) : IClassFixture<StaffRolesApiFactory>
{
    public static TheoryData<string, StaffRoleName, string, HttpStatusCode> Rows => new()
    {
        { "moderator.console", StaffRoleName.Moderator, "/api/admin/session", HttpStatusCode.OK },
        { "moderator.dashboard", StaffRoleName.Moderator, "/api/admin/dashboard/probe", HttpStatusCode.NoContent },
        { "moderator.members", StaffRoleName.Moderator, "/api/admin/members", HttpStatusCode.OK },
        { "moderator.events", StaffRoleName.Moderator, "/api/admin/events", HttpStatusCode.Forbidden },
        { "moderator.services", StaffRoleName.Moderator, "/api/admin/services/probe", HttpStatusCode.Forbidden },
        { "moderator.series", StaffRoleName.Moderator, "/api/admin/series", HttpStatusCode.OK },
        { "moderator.publishing", StaffRoleName.Moderator, "/api/admin/stories/bylines", HttpStatusCode.Forbidden },
        { "moderator.unlisted", StaffRoleName.Moderator, "/api/admin/reports/probe", HttpStatusCode.Forbidden },
        { "admin.console", StaffRoleName.Admin, "/api/admin/session", HttpStatusCode.OK },
        { "admin.dashboard", StaffRoleName.Admin, "/api/admin/dashboard/probe", HttpStatusCode.NoContent },
        { "admin.members", StaffRoleName.Admin, "/api/admin/members", HttpStatusCode.OK },
        { "admin.events", StaffRoleName.Admin, "/api/admin/events", HttpStatusCode.OK },
        { "admin.services", StaffRoleName.Admin, "/api/admin/services/probe", HttpStatusCode.NoContent },
        { "admin.series", StaffRoleName.Admin, "/api/admin/series", HttpStatusCode.OK },
        { "admin.publishing", StaffRoleName.Admin, "/api/admin/stories/bylines", HttpStatusCode.OK },
        { "admin.unlisted", StaffRoleName.Admin, "/api/admin/reports/probe", HttpStatusCode.NoContent },
    };

    [Theory]
    [MemberData(nameof(Rows))]
    public async Task Given_signed_in_staff_When_they_ask_an_admin_area_Then_their_role_decides_it(string who, StaffRoleName role, string path, HttpStatusCode expected)
    {
        using var client = Browser.CreateClient(factory);
        var email = $"{who}@example.org";
        await Staff.CreateAsync(factory, client, email, role);
        using var signedIn = await Staff.SignInWithCodeAsync(client, email);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, path, Staff.Cookie(signedIn));

        Assert.Equal(expected, response.StatusCode);
        if (expected == HttpStatusCode.Forbidden)
        {
            await AssertRefusedAsync(response, "forbidden_role");
        }
    }

    // L2-019 AC4: the role in the database decides each request, not the one the session began with.
    [Fact]
    public async Task Given_a_Moderator_made_Admin_while_signed_in_When_they_next_ask_for_events_Then_it_is_allowed_without_a_new_sign_in()
    {
        using var client = Browser.CreateClient(factory);
        var id = await Staff.CreateAsync(factory, client, "joel.promoted@example.org", StaffRoleName.Moderator);
        using var signedIn = await Staff.SignInWithCodeAsync(client, "joel.promoted@example.org");
        var cookie = Staff.Cookie(signedIn);
        using (var before = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/events", cookie))
        {
            await AssertRefusedAsync(before, "forbidden_role");
        }

        await SetRoleAsync(id, StaffRoleName.Admin);

        using var after = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/events", cookie);
        Assert.Equal(HttpStatusCode.OK, after.StatusCode);
    }

    [Fact]
    public async Task Given_an_Admin_made_Moderator_while_signed_in_When_they_next_ask_for_services_Then_it_is_refused_with_forbidden_role()
    {
        using var client = Browser.CreateClient(factory);
        var id = await Staff.CreateAsync(factory, client, "dana.demoted@example.org", StaffRoleName.Admin);
        using var signedIn = await Staff.SignInWithCodeAsync(client, "dana.demoted@example.org");
        var cookie = Staff.Cookie(signedIn);
        using (var before = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/services/probe", cookie))
        {
            Assert.Equal(HttpStatusCode.NoContent, before.StatusCode);
        }

        await SetRoleAsync(id, StaffRoleName.Moderator);

        using var after = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/services/probe", cookie);
        await AssertRefusedAsync(after, "forbidden_role");
    }

    [Fact]
    public async Task Given_staff_whose_role_was_taken_away_When_they_ask_an_area_their_role_opened_Then_it_is_refused_with_not_staff()
    {
        using var client = Browser.CreateClient(factory);
        var id = await Staff.CreateAsync(factory, client, "joel.removed@example.org", StaffRoleName.Moderator);
        using var signedIn = await Staff.SignInWithCodeAsync(client, "joel.removed@example.org");

        await SetRoleAsync(id, role: null);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/members", Staff.Cookie(signedIn));
        await AssertRefusedAsync(response, "not_staff");
    }

    /// <summary>Changes the member's role in the store, or takes it away, as a later staff screen would.</summary>
    private async Task SetRoleAsync(string memberId, StaffRoleName? role)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var id = Guid.Parse(memberId);
        db.StaffRoles.Remove(await db.StaffRoles.SingleAsync(r => r.MemberId == id, TestContext.Current.CancellationToken));
        if (role is { } name)
        {
            db.StaffRoles.Add(StaffRole.Grant(await db.Members.SingleAsync(m => m.Id == id, TestContext.Current.CancellationToken), name));
        }

        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>A 403 that carries only the code: nothing of the role, the member or the area.</summary>
    internal static async Task AssertRefusedAsync(HttpResponseMessage response, string code)
    {
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["code", "status", "title", "traceId", "type"], problem.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(code, problem.GetProperty("code").GetString());
    }
}
