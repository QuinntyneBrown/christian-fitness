using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// The API on a clock the tests hold, with the directory listings and hosted events a test puts in
/// the store. Until suggestions and claims exist (journeys 17 to 19) nothing in the product makes a
/// listing, so the tests make them through the domain as staff's check will (ADR 0082).
/// </summary>
public sealed class DirectoryFactory : ApiFactory
{
    public static readonly DateTimeOffset Now = new(2026, 11, 25, 15, 0, 0, TimeSpan.Zero);

    public FakeTimeProvider Time { get; } = new(Now);

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(Time);
    }

    /// <summary>Empties the directory and the events, so each test starts from what it puts in.</summary>
    public async Task ClearAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.DirectoryListings.RemoveRange(db.DirectoryListings);
        db.Events.RemoveRange(db.Events);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>Puts a listing in the store, published unless <paramref name="status"/> says otherwise.</summary>
    public async Task<Guid> AddListingAsync(
        ListingKind kind,
        string name,
        string tagline = "A tagline",
        string area = "Etobicoke",
        string[]? focus = null,
        ListingStatus status = ListingStatus.Published,
        bool verified = false,
        string? photoKey = null)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var listing = DirectoryListing.CreateDraft(Guid.CreateVersion7(), kind, name, tagline, area, focus ?? [], Now, isVerified: verified);
        listing.ShowPhoto(photoKey);
        switch (status)
        {
            case ListingStatus.Published:
                listing.Publish(Now);
                break;
            case ListingStatus.Declined:
                listing.Decline();
                break;
            case ListingStatus.Removed:
                listing.Publish(Now);
                listing.Remove();
                break;
            case ListingStatus.Draft:
                break;
        }

        db.DirectoryListings.Add(listing);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return listing.Id;
    }

    /// <summary>Puts an event hosted by <paramref name="host"/> in the store: published, a draft, or published then cancelled.</summary>
    public async Task AddEventAsync(Guid host, DateTimeOffset startsAt, EventStatus status = EventStatus.Published)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var e = Event.CreateDraft("Saturday run", EventCategory.Run, startsAt, "Martin Goodman Trail", "Waterfront, Toronto", 0, 20, "Come run with us.", Now);
        e.HostedBy(host);
        if (status != EventStatus.Draft)
        {
            e.Publish();
        }

        if (status == EventStatus.Cancelled)
        {
            e.Cancel();
        }

        db.Events.Add(e);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }
}
