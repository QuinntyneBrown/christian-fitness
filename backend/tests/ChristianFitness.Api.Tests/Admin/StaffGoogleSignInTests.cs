using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Google;
using ChristianFitness.Api.Tests.Sessions;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>
/// L2-018 AC1, AC2, L2-049 AC3, AC4, L2-030 AC3 (ADR 0100): back from Google, Staff sign in
/// finishes with <c>POST /api/admin/session/google</c>. A verified account of the team's domain
/// whose member account holds a staff role gets a staff session, bound to its Google subject. In
/// order, refusals are: no identity or an unverified email, 401 <c>google_email_unverified</c>; an
/// account outside the domain, 403 <c>wrong_domain</c> naming it; one with no console role, 403
/// <c>not_staff</c> naming it; a suspended member, 403 <c>account_suspended</c>. No refusal starts
/// a session, and each one forgets the identity.
/// </summary>
public sealed class StaffGoogleSignInTests(ProtectionsApiFactory factory) : IClassFixture<ProtectionsApiFactory>
{
    private const string Expired = "expires=thu, 01 jan 1970 00:00:00 gmt";

    [Fact]
    public async Task Given_staff_with_a_role_When_they_finish_Google_sign_in_Then_they_get_a_staff_session_and_it_is_audited()
    {
        using var client = Browser.CreateClient(factory);
        var id = Guid.Parse(await Staff.CreateAsync(factory, client, "dana.google.in@example.org", StaffRoleName.Admin, twoStep: false));
        var at = factory.Time.GetUtcNow();

        using var response = await Staff.SignInWithGoogleAsync(factory, client, "dana.google.in@example.org");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var session = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["memberId", "name", "role"], session.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal((id.ToString(), "Admin"), (session.GetProperty("memberId").GetString(), session.GetProperty("role").GetString()));
        var attributes = Browser.Attributes(Assert.IsType<string>(Staff.SetCookie(response)));
        Assert.Contains("httponly", attributes);
        Assert.Contains("secure", attributes);
        Assert.Contains("samesite=strict", attributes);
        using var me = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", Staff.Cookie(response));
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        Assert.Contains(Expired, Browser.Attributes(Assert.IsType<string>(Browser.SetCookie(response, GoogleSignIn.ExternalCookieName))));
        Assert.Contains((id, "staff_session.started", id, at), await AuditOfAsync(id));
    }

    [Fact]
    public async Task Given_the_seeded_Admin_with_no_password_When_they_first_sign_in_with_Google_Then_the_account_is_bound_to_that_Google_account()
    {
        using var client = Browser.CreateClient(factory);
        var id = await SeedAdminAsync("first.admin.google@christian.fitness");
        var google = Staff.WorkspaceAccount("First.Admin.Google@christian.fitness");

        using var first = await Staff.SignInWithGoogleAsync(factory, client, google.Email, google);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(google.Subject, await SubjectOfAsync(id));
        // Bound: the same Google account signs in again after its email changes.
        var renamed = new GoogleAccount { Subject = google.Subject, Email = "dana.reyes@christian.fitness", HostedDomain = FakeGoogle.StaffDomain };
        using var again = await Staff.SignInWithGoogleAsync(factory, client, renamed.Email, renamed);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        var session = await again.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(id.ToString(), session.GetProperty("memberId").GetString());
    }

    [Theory]
    [InlineData("dana.wrong.gmail@example.org", null)]
    [InlineData("dana.wrong.workspace@example.org", "other.org")]
    public async Task Given_an_account_outside_the_team_domain_When_it_finishes_Then_it_is_refused_wrong_domain_naming_it(string email, string? hostedDomain)
    {
        using var client = Browser.CreateClient(factory);
        // Even a staff member's own email is refused from outside the domain: the domain is Google's signed answer.
        await Staff.CreateAsync(factory, client, email, StaffRoleName.Admin, twoStep: false);
        var google = new GoogleAccount { Email = email, HostedDomain = hostedDomain };

        using var response = await Staff.SignInWithGoogleAsync(factory, client, google.Email, google);

        var problem = await AssertRefusedAsync(response, HttpStatusCode.Forbidden, "wrong_domain");
        Assert.Equal(email, problem.GetProperty("account").GetString());
    }

    [Fact]
    public async Task Given_a_member_of_the_domain_with_no_console_role_When_they_finish_Then_it_is_refused_not_staff_naming_them()
    {
        using var client = Browser.CreateClient(factory);
        var id = Guid.Parse(await Staff.CreateAsync(factory, client, "sam.no.role@example.org", role: null));

        using var response = await Staff.SignInWithGoogleAsync(factory, client, "sam.no.role@example.org");

        var problem = await AssertRefusedAsync(response, HttpStatusCode.Forbidden, "not_staff");
        Assert.Equal("sam.no.role@example.org", problem.GetProperty("account").GetString());
        // Nothing is bound by a refusal.
        Assert.Null(await SubjectOfAsync(id));
    }

    [Fact]
    public async Task Given_a_Workspace_account_with_no_member_account_When_it_finishes_Then_it_is_refused_not_staff()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Staff.SignInWithGoogleAsync(factory, client, "new.hire@christian.fitness");

        var problem = await AssertRefusedAsync(response, HttpStatusCode.Forbidden, "not_staff");
        Assert.Equal("new.hire@christian.fitness", problem.GetProperty("account").GetString());
    }

    [Fact]
    public async Task Given_staff_bound_to_a_Google_account_When_another_Google_account_with_their_email_finishes_Then_it_is_refused_not_staff()
    {
        using var client = Browser.CreateClient(factory);
        var id = Guid.Parse(await Staff.CreateAsync(factory, client, "dana.bound.google@example.org", StaffRoleName.Admin, twoStep: false));
        using (var bound = await Staff.SignInWithGoogleAsync(factory, client, "dana.bound.google@example.org"))
        {
            Assert.Equal(HttpStatusCode.OK, bound.StatusCode);
        }

        var other = new GoogleAccount { Email = "dana.bound.google@example.org", HostedDomain = FakeGoogle.StaffDomain };
        using var response = await Staff.SignInWithGoogleAsync(factory, client, other.Email, other);

        await AssertRefusedAsync(response, HttpStatusCode.Forbidden, "not_staff");
        Assert.Equal(Staff.WorkspaceAccount("dana.bound.google@example.org").Subject, await SubjectOfAsync(id));
    }

    [Fact]
    public async Task Given_suspended_staff_When_they_finish_Then_it_is_refused_account_suspended()
    {
        using var client = Browser.CreateClient(factory);
        var id = Guid.Parse(await Staff.CreateAsync(factory, client, "joel.suspended.google@example.org", StaffRoleName.Moderator, twoStep: false));
        await SuspendAsync(id);

        using var response = await Staff.SignInWithGoogleAsync(factory, client, "joel.suspended.google@example.org");

        var problem = await AssertRefusedAsync(response, HttpStatusCode.Forbidden, "account_suspended");
        Assert.False(problem.TryGetProperty("account", out _));
    }

    [Fact]
    public async Task Given_no_Google_identity_When_the_screen_finishes_Then_it_is_refused_google_email_unverified()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Staff.FinishGoogleAsync(client, external: null);

        await AssertRefusedAsync(response, HttpStatusCode.Unauthorized, "google_email_unverified", forgets: false);
    }

    [Fact]
    public async Task Given_an_unverified_email_When_it_finishes_Then_it_is_refused_google_email_unverified()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.unverified.google@example.org", StaffRoleName.Admin, twoStep: false);
        var google = Staff.WorkspaceAccount("dana.unverified.google@example.org");
        google = new GoogleAccount { Subject = google.Subject, Email = google.Email, HostedDomain = google.HostedDomain, EmailVerified = false };

        using var response = await Staff.SignInWithGoogleAsync(factory, client, google.Email, google);

        await AssertRefusedAsync(response, HttpStatusCode.Unauthorized, "google_email_unverified");
    }

    [Fact]
    public async Task Given_an_identity_kept_by_the_member_app_When_Staff_sign_in_finishes_with_it_Then_it_is_no_identity()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.cross.app@example.org", StaffRoleName.Admin, twoStep: false);
        var member = await GoogleSignIn.ExternalCookieAsync(client, factory.Google, GoogleApp.Member, Staff.WorkspaceAccount("dana.cross.app@example.org"));

        using var response = await Staff.FinishGoogleAsync(client, member);

        await AssertRefusedAsync(response, HttpStatusCode.Unauthorized, "google_email_unverified", forgets: false);
    }

    [Fact]
    public async Task Given_staff_signed_in_When_they_sign_in_again_sending_the_old_cookie_Then_the_old_session_key_no_longer_works()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.rotate.google@example.org", StaffRoleName.Admin, twoStep: false);
        using var first = await Staff.SignInWithGoogleAsync(factory, client, "dana.rotate.google@example.org");
        var old = Staff.Cookie(first);

        using var second = await Staff.SignInWithGoogleAsync(factory, client, "dana.rotate.google@example.org", cookies: old);

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.NotEqual(old, Staff.Cookie(second));
        using var withOld = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", old);
        Assert.Equal(HttpStatusCode.Unauthorized, withOld.StatusCode);
        using var withNew = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", Staff.Cookie(second));
        Assert.Equal(HttpStatusCode.OK, withNew.StatusCode);
    }

    /// <summary>A refusal: its status and code, no staff session, and (unless none came) the identity forgotten.</summary>
    private static async Task<JsonElement> AssertRefusedAsync(HttpResponseMessage response, HttpStatusCode status, string code, bool forgets = true)
    {
        Assert.Equal(status, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(code, problem.GetProperty("code").GetString());
        Assert.Null(Staff.SetCookie(response));
        if (forgets)
        {
            Assert.Contains(Expired, Browser.Attributes(Assert.IsType<string>(Browser.SetCookie(response, GoogleSignIn.ExternalCookieName))));
        }

        return problem;
    }

    /// <summary>The first Admin as <c>cf seed</c> makes it: no password, no Google subject.</summary>
    private async Task<Guid> SeedAdminAsync(string email)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var member = Member.Join("Christian Fitness Admin", email, string.Empty, factory.Time.GetUtcNow());
        db.Members.Add(member);
        db.StaffRoles.Add(StaffRole.Grant(member, StaffRoleName.Admin));
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return member.Id;
    }

    private async Task<string?> SubjectOfAsync(Guid id)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Members.Where(m => m.Id == id).Select(m => m.GoogleSubject).SingleAsync(TestContext.Current.CancellationToken);
    }

    private async Task SuspendAsync(Guid id)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var member = await db.Members.SingleAsync(m => m.Id == id, TestContext.Current.CancellationToken);
        Assert.True(member.TrySuspend("Test suspension."));
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    private async Task<List<(Guid Actor, string Action, Guid RecordId, DateTimeOffset At)>> AuditOfAsync(Guid actor)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var entries = await db.AuditEntries.AsNoTracking().Where(e => e.ActorMemberId == actor).ToListAsync(TestContext.Current.CancellationToken);
        return [.. entries.Select(e => (e.ActorMemberId, e.Action, e.RecordId, e.OccurredAt))];
    }
}
