using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Google;
using ChristianFitness.Api.Tests.Preferences;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-066 AC8 (journey 36; ADR 0118): within the 30 days, signing in to a deleting account with its
/// password or its Google account answers 409 <c>account_deleting</c> with the account and the
/// time it is erased, and no session; Restore re-proves the same credentials, clears the deletion
/// and signs the member in, audited with the member as actor. Places that went back stay gone.
/// </summary>
public sealed class RestoreAccountTests(DeleteAccountFactory factory) : IClassFixture<DeleteAccountFactory>
{
    private const string RestorePath = "/api/account/restore";
    private const string GoogleRestorePath = "/api/account/restore/google";
    private const string GoogleCompletePath = "/api/session/google";

    [Fact]
    public async Task Given_a_deleting_account_When_it_signs_in_with_its_password_Then_it_is_told_it_is_deleting_and_Restore_signs_it_in_again()
    {
        using var client = Browser.CreateClient(factory);
        const string email = "grace.restore.password@example.org";
        var (cookie, grace) = await Prefs.JoinAsync(factory, client, email);
        await Prefs.JoinAsync(factory, client, "tyler.restore.password@example.org");
        var deletedAt = factory.Time.GetUtcNow();
        using (var deleted = await Deletion.RequestAsync(client, cookie))
        {
            Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        }

        factory.Time.Advance(TimeSpan.FromDays(29));
        var tylerCookie = await Deletion.SecondSessionAsync(client, "tyler.restore.password@example.org");

        using var signIn = await Browser.SignInAsync(client, email, Staff.Password);

        Assert.Equal(HttpStatusCode.Conflict, signIn.StatusCode);
        Assert.Null(Browser.SessionSetCookie(signIn));
        await AssertDeletingAsync(signIn, email, deletedAt);

        using var restored = await client.PostAsJsonAsync(new Uri(RestorePath, UriKind.Relative), new { email, password = Staff.Password }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, restored.StatusCode);
        var session = await restored.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(grace, session.GetProperty("memberId").GetGuid());
        using (var me = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", Browser.SessionCookie(restored)))
        {
            Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        }

        Assert.Null((await Deletion.MemberAsync(factory, grace)).DeletionRequestedAt);
        using (var profile = await Browser.SendAsync(client, HttpMethod.Get, $"/api/members/{grace}/profile", tylerCookie))
        {
            Assert.Equal(HttpStatusCode.OK, profile.StatusCode);
        }

        await AssertRestoreAuditedAsync(grace);

        // Signed in again, the password works as before.
        using var again = await Browser.SignInAsync(client, email, Staff.Password);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
    }

    [Fact]
    public async Task Given_a_deleting_account_When_Restore_is_sent_with_a_wrong_password_Then_it_is_refused_and_stays_deleting()
    {
        using var client = Browser.CreateClient(factory);
        const string email = "grace.restore.wrong@example.org";
        var (cookie, grace) = await Prefs.JoinAsync(factory, client, email);
        var deletedAt = factory.Time.GetUtcNow();
        using (var deleted = await Deletion.RequestAsync(client, cookie))
        {
            Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        }

        using var restored = await client.PostAsJsonAsync(new Uri(RestorePath, UriKind.Relative), new { email, password = "not-the-password" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, restored.StatusCode);
        Assert.Equal("invalid_credentials", await Deletion.CodeOfAsync(restored));
        Assert.Null(Browser.SessionSetCookie(restored));
        Assert.NotNull((await Deletion.MemberAsync(factory, grace)).DeletionRequestedAt);
    }

    [Fact]
    public async Task Given_a_deleting_account_When_it_signs_in_with_Google_Then_it_is_told_it_is_deleting_and_Restore_with_that_Google_account_signs_it_in()
    {
        using var client = Browser.CreateClient(factory);
        const string email = "grace.restore.google@example.org";
        var (cookie, grace) = await Prefs.JoinAsync(factory, client, email);
        var deletedAt = factory.Time.GetUtcNow();
        using (var deleted = await Deletion.RequestAsync(client, cookie))
        {
            Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        }

        var external = await GoogleSignIn.ExternalCookieAsync(client, factory.Google, GoogleApp.Member, new GoogleAccount { Email = email });

        using var signIn = await AdminEvents.SendAsync(client, HttpMethod.Post, GoogleCompletePath, external, new { });

        Assert.Equal(HttpStatusCode.Conflict, signIn.StatusCode);
        Assert.Null(Browser.SessionSetCookie(signIn));
        await AssertDeletingAsync(signIn, email, deletedAt);

        // The identity is kept for Restore, which signs the member in with it and forgets it.
        using var restored = await AdminEvents.SendAsync(client, HttpMethod.Post, GoogleRestorePath, external, new { });

        Assert.Equal(HttpStatusCode.OK, restored.StatusCode);
        Assert.Equal(grace, (await restored.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("memberId").GetGuid());
        Assert.NotNull(Browser.SessionSetCookie(restored));
        Assert.Contains("expires=thu, 01 jan 1970 00:00:00 gmt", Browser.Attributes(Assert.IsType<string>(Browser.SetCookie(restored, GoogleSignIn.ExternalCookieName))));
        Assert.Null((await Deletion.MemberAsync(factory, grace)).DeletionRequestedAt);
        await AssertRestoreAuditedAsync(grace);
    }

    [Fact]
    public async Task Given_no_Google_identity_When_Restore_with_Google_is_sent_Then_it_is_refused_and_nothing_is_restored()
    {
        using var client = Browser.CreateClient(factory);

        using var restored = await AdminEvents.SendAsync(client, HttpMethod.Post, GoogleRestorePath, cookie: null, new { });

        Assert.Equal(HttpStatusCode.Unauthorized, restored.StatusCode);
        Assert.Equal("google_email_unverified", await Deletion.CodeOfAsync(restored));
    }

    private static async Task AssertDeletingAsync(HttpResponseMessage response, string email, DateTimeOffset deletedAt)
    {
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("account_deleting", problem.GetProperty("code").GetString());
        Assert.Equal(email, problem.GetProperty("account").GetString());
        Assert.Equal(deletedAt + TimeSpan.FromDays(30), problem.GetProperty("erasesAt").GetDateTimeOffset());
    }

    private async Task AssertRestoreAuditedAsync(Guid grace)
    {
        using var scope = factory.Services.CreateScope();
        var audit = Assert.Single(await scope.ServiceProvider.GetRequiredService<AppDbContext>().AuditEntries.AsNoTracking()
            .Where(a => a.Action == "account.restored" && a.ActorMemberId == grace).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal(("Member", grace), (audit.RecordType, audit.RecordId));
    }
}
