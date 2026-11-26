using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Chat;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// What the review tests share (journey 18; ADR 0090): a member who suggests, staff who review, and the
/// console's directory endpoints, on <see cref="RegisterForEventFactory"/>'s clock.
/// </summary>
internal sealed class ReviewSuggestions(RegisterForEventFactory factory)
{
    public const string Base = "/api/admin/directory";

    /// <summary>A member who suggested: their session cookie, id and the suggestion's id.</summary>
    public sealed record Suggested(string Cookie, Guid MemberId, Guid Id);

    /// <summary>A member named <paramref name="name"/> joins and suggests; the clock then moves a minute.</summary>
    public async Task<Suggested> SuggestAsync(string email, string name, Dictionary<string, object?>? body = null)
    {
        await SystemAccount.SeedAsync(factory);
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email) with { FullName = name });
        using var response = await AdminEvents.SendAsync(client, HttpMethod.Post, SuggestListingTests.Path, cookie, body ?? SuggestListingTests.Valid());
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var id = (await JsonAsync(response)).GetProperty("id").GetGuid();
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        var normalized = Member.NormalizeEmail(email);
        var memberId = await InDbAsync(db => db.Members.Where(m => m.NormalizedEmail == normalized).Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken));
        return new Suggested(cookie, memberId, id);
    }

    /// <summary>A signed-in staff member with <paramref name="role"/>: a client, its cookie and their id.</summary>
    public async Task<(HttpClient Client, string Cookie, Guid Id)> StaffAsync(string email, StaffRoleName role = StaffRoleName.Admin)
    {
        var client = Browser.CreateClient(factory);
        var id = Guid.Parse(await Staff.CreateAsync(factory, client, email, role));
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, client, email);
        return (client, Staff.Cookie(signedIn), id);
    }

    public static Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string path, string cookie, object? body = null) =>
        AdminEvents.SendAsync(client, method, Base + path, cookie, body);

    public static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);

    /// <summary>Marks the suggestion decided as <paramref name="status"/> now, as a decision made elsewhere would.</summary>
    public async Task DecideAsync(Guid id, SuggestionStatus status)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var suggestion = await db.ListingSuggestions.SingleAsync(s => s.Id == id, TestContext.Current.CancellationToken);
        db.Entry(suggestion).Property(s => s.Status).CurrentValue = status;
        db.Entry(suggestion).Property(s => s.DecidedAt).CurrentValue = factory.Time.GetUtcNow();
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>Suspends the member <paramref name="id"/>, as a moderation elsewhere would.</summary>
    public async Task SuspendAsync(Guid id)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var member = await db.Members.SingleAsync(m => m.Id == id, TestContext.Current.CancellationToken);
        db.Entry(member).Property(m => m.Status).CurrentValue = MemberStatus.Suspended;
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    public async Task<T> InDbAsync<T>(Func<AppDbContext, Task<T>> read)
    {
        using var scope = factory.Services.CreateScope();
        return await read(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }
}
