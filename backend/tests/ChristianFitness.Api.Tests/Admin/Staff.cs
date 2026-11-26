using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using ChristianFitness.Api.Tests.Google;
using ChristianFitness.Api.Tests.Sessions;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>
/// What the admin tests need: a staff account, and signing in to the admin app as staff do, with
/// their Google Workspace account (ADR 0011, ADR 0100).
/// </summary>
internal static class Staff
{
    /// <summary>The member password every test account joins with.</summary>
    public const string Password = "abundantlife";
    public const string CookieName = "__Host-cf-admin";

    /// <summary>
    /// Joins through the API, then grants <paramref name="role"/> in the store, as <c>cf seed</c>
    /// or a later staff screen would: no endpoint grants a role yet. Answers the member's id.
    /// </summary>
    public static async Task<string> CreateAsync(WebApplicationFactory<Program> factory, HttpClient client, string email, StaffRoleName? role)
    {
        var id = await SignInTests.JoinAsync(client, email);
        if (role is { } name)
        {
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var member = await db.Members.SingleAsync(m => m.Id == Guid.Parse(id), TestContext.Current.CancellationToken);
            db.StaffRoles.Add(StaffRole.Grant(member, name));
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        return id;
    }

    /// <summary>Where Staff sign in finishes Google sign-in (ADR 0100).</summary>
    public const string GoogleFinishPath = "/api/admin/session/google";

    /// <summary>
    /// The Google Workspace account of <paramref name="email"/> in the team's domain. Its subject is
    /// worked from the email, so the same person comes back as the same Google account.
    /// </summary>
    public static GoogleAccount WorkspaceAccount(string email) => new()
    {
        Subject = "2" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(email.ToUpperInvariant())))[..20],
        Email = email,
        HostedDomain = FakeGoogle.StaffDomain,
    };

    /// <summary>Finishes staff Google sign-in with <paramref name="external"/>, the <c>__Host-cf-google</c> cookie or none, and any further <paramref name="cookies"/>.</summary>
    public static async Task<HttpResponseMessage> FinishGoogleAsync(HttpClient client, string? external, string? cookies = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(GoogleFinishPath, UriKind.Relative))
        {
            Content = JsonContent.Create(new { }),
        };
        var sent = string.Join("; ", new[] { external, cookies }.Where(c => c is not null));
        if (sent.Length > 0)
        {
            request.Headers.Add("Cookie", sent);
        }

        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Signs in to the admin app as staff do: Google, with <paramref name="account"/> (by default
    /// the Workspace account of <paramref name="email"/>), then the screen's finish. Answers the
    /// finish's response.
    /// </summary>
    public static async Task<HttpResponseMessage> SignInWithGoogleAsync(ApiFactory factory, HttpClient client, string email, GoogleAccount? account = null, string? cookies = null)
    {
        ArgumentNullException.ThrowIfNull(factory);
        var external = await GoogleSignIn.ExternalCookieAsync(client, factory.Google, GoogleApp.Staff, account ?? WorkspaceAccount(email)).ConfigureAwait(false);
        return await FinishGoogleAsync(client, external, cookies).ConfigureAwait(false);
    }

    /// <summary>The <c>Set-Cookie</c> value of the staff session cookie, with its attributes.</summary>
    public static string? SetCookie(HttpResponseMessage response) => Browser.SetCookie(response, CookieName);

    /// <summary>The staff session cookie as a request sends it back (<c>name=value</c>).</summary>
    public static string Cookie(HttpResponseMessage response) =>
        (SetCookie(response) ?? throw new InvalidOperationException("The response set no staff session cookie.")).Split(';')[0];
}
