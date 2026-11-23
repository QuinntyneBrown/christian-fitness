using System.Net.Http.Json;
using System.Text;
using ChristianFitness.Api.Tests.Sessions;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>
/// What the admin tests need: a staff account with two-step verification set up, and signing in
/// to the admin app as staff do, password then code (ADR 0011, ADR 0013).
/// </summary>
internal static class Staff
{
    public const string Password = "abundantlife";
    public const string CookieName = "__Host-cf-admin";
    public const string StepCookieName = "__Host-cf-admin-step";

    /// <summary>The authenticator secret every test staff account is set up with.</summary>
    public static readonly byte[] Secret = Encoding.ASCII.GetBytes("christian-fitness-20");

    /// <summary>
    /// Joins through the API, then grants <paramref name="role"/> in the store, as <c>cf seed</c>
    /// or a later staff screen would: no endpoint grants a role yet. A staff account is set up for
    /// two-step verification with <see cref="Secret"/>, as <c>cf two-step</c> would, unless
    /// <paramref name="twoStep"/> is false. Answers the member's id.
    /// </summary>
    public static async Task<string> CreateAsync(WebApplicationFactory<Program> factory, HttpClient client, string email, StaffRoleName? role, bool twoStep = true)
    {
        var id = await SignInTests.JoinAsync(client, email);
        if (role is { } name)
        {
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var member = await db.Members.SingleAsync(m => m.Id == Guid.Parse(id), TestContext.Current.CancellationToken);
            db.StaffRoles.Add(StaffRole.Grant(member, name));
            if (twoStep)
            {
                db.StaffTwoSteps.Add(StaffTwoStep.SetUp(member.Id, Secret, member.JoinedAt));
            }

            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        return id;
    }

    /// <summary>The password step: signs in to the admin app with <paramref name="email"/> and <paramref name="password"/>.</summary>
    public static Task<HttpResponseMessage> SignInAsync(HttpClient client, string email, string password) =>
        client.PostAsJsonAsync(new Uri("/api/admin/session", UriKind.Relative), new { email, password }, TestContext.Current.CancellationToken);

    /// <summary>The second step: sends <paramref name="code"/> with <paramref name="cookie"/>, the step cookie or none.</summary>
    public static async Task<HttpResponseMessage> VerifyAsync(HttpClient client, string? cookie, string? code)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri("/api/admin/session/two-step", UriKind.Relative))
        {
            Content = JsonContent.Create(new { code }),
        };
        if (cookie is not null)
        {
            request.Headers.Add("Cookie", cookie);
        }

        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }

    /// <summary>The authenticator's code at <paramref name="now"/> for <see cref="Secret"/>.</summary>
    public static string CodeAt(DateTimeOffset now) => Totp.CodeAt(Secret, Totp.StepAt(now));

    /// <summary>
    /// Both steps, as staff do: the password, then the code their app shows at <paramref name="now"/>
    /// (the system clock unless a fixture moves its own). Answers the second step's response.
    /// </summary>
    public static async Task<HttpResponseMessage> SignInWithCodeAsync(HttpClient client, string email, DateTimeOffset? now = null)
    {
        using var passwordStep = await SignInAsync(client, email, Password);
        return await VerifyAsync(client, StepCookie(passwordStep), CodeAt(now ?? DateTimeOffset.UtcNow));
    }

    /// <summary>The <c>Set-Cookie</c> value of the staff session cookie, with its attributes.</summary>
    public static string? SetCookie(HttpResponseMessage response) => Browser.SetCookie(response, CookieName);

    /// <summary>The staff session cookie as a request sends it back (<c>name=value</c>).</summary>
    public static string Cookie(HttpResponseMessage response) =>
        (SetCookie(response) ?? throw new InvalidOperationException("The response set no staff session cookie.")).Split(';')[0];

    /// <summary>The <c>Set-Cookie</c> value of the pending sign-in's step cookie, with its attributes.</summary>
    public static string? StepSetCookie(HttpResponseMessage response) => Browser.SetCookie(response, StepCookieName);

    /// <summary>The step cookie as a request sends it back (<c>name=value</c>).</summary>
    public static string StepCookie(HttpResponseMessage response) =>
        (StepSetCookie(response) ?? throw new InvalidOperationException("The response set no step cookie.")).Split(';')[0];
}
