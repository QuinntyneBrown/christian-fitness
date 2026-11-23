using System.Net.Http.Json;
using ChristianFitness.Api.Tests.Sessions;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>What the admin tests need: a staff account, and signing in to the admin app as staff do.</summary>
internal static class Staff
{
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

    /// <summary>Signs in to the admin app with <paramref name="email"/> and <paramref name="password"/>.</summary>
    public static Task<HttpResponseMessage> SignInAsync(HttpClient client, string email, string password) =>
        client.PostAsJsonAsync(new Uri("/api/admin/session", UriKind.Relative), new { email, password }, TestContext.Current.CancellationToken);

    /// <summary>The <c>Set-Cookie</c> value of the staff session cookie, with its attributes.</summary>
    public static string? SetCookie(HttpResponseMessage response) => Browser.SetCookie(response, CookieName);

    /// <summary>The staff session cookie as a request sends it back (<c>name=value</c>).</summary>
    public static string Cookie(HttpResponseMessage response) =>
        (SetCookie(response) ?? throw new InvalidOperationException("The response set no staff session cookie.")).Split(';')[0];
}
