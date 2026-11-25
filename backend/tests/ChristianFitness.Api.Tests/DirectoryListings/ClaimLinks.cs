using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// What the claim tests share (journey 19; ADR 0092): a draft listing with an open claim, issued as
/// approval issues one (ADR 0090), members who open its link, and the claim endpoints, on
/// <see cref="RegisterForEventFactory"/>'s clock.
/// </summary>
internal sealed class ClaimLinks(RegisterForEventFactory factory)
{
    public static string PathOf(string token) => $"/api/claims/{token}";

    /// <summary>A draft listing named <paramref name="name"/> with a claim issued now: its id and the link's token.</summary>
    public async Task<(Guid ListingId, string Token)> IssueAsync(string name = "Eastside Ladies Who Lift", ListingKind kind = ListingKind.Organization)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = factory.Time.GetUtcNow();
        var listing = DirectoryListing.CreateDraft(
            Guid.CreateVersion7(now),
            kind,
            name,
            "Saturday morning strength group out of Danforth Baptist",
            "East York",
            ["Strength", "Beginners"],
            now,
            "About 25 women, coached by a CSEP trainer.",
            "https://eastsideladies.ca");
        var (claim, token) = ListingClaim.Issue(listing.Id, now);
        db.DirectoryListings.Add(listing);
        db.ListingClaims.Add(claim);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return (listing.Id, token);
    }

    /// <summary>A member who joined with <paramref name="email"/>: a client, its session cookie and their id.</summary>
    public async Task<(HttpClient Client, string Cookie, Guid Id)> MemberAsync(string email, string name = "Grace Thompson")
    {
        var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email) with { FullName = name });
        var normalized = Member.NormalizeEmail(email);
        var id = await InDbAsync(db => db.Members.Where(m => m.NormalizedEmail == normalized).Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken));
        return (client, cookie, id);
    }

    public static Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string path, string? cookie) =>
        AdminEvents.SendAsync(client, method, path, cookie);

    public static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);

    public async Task<T> InDbAsync<T>(Func<AppDbContext, Task<T>> read)
    {
        using var scope = factory.Services.CreateScope();
        return await read(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }
}
