using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Services;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
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

    /// <summary>Empties the directory, the events and Services, so each test starts from what it puts in.</summary>
    public async Task ClearAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.ListingFollows.RemoveRange(db.ListingFollows);
        db.ListingConnections.RemoveRange(db.ListingConnections);
        db.DirectoryListings.RemoveRange(db.DirectoryListings);
        db.Events.RemoveRange(db.Events);
        db.ServiceListings.RemoveRange(db.ServiceListings);
        db.ProfessionalApplications.RemoveRange(db.ProfessionalApplications);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>Lists <paramref name="member"/> in Services under <paramref name="name"/>, as staff's approval does.</summary>
    public async Task<Guid> AddServiceListingAsync(Guid member, string name)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var application = ProfessionalApplication.Submit(member, "Personal trainer", ServiceCategory.Training, "CSCS", "East York", "$70", "About.", Now);
        Assert.True(application.TryApprove(name, Now, out var listing));
        db.ProfessionalApplications.Add(application);
        db.ServiceListings.Add(listing!);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return listing!.Id;
    }

    /// <summary>
    /// Links the directory listing to a Services listing, as staff will in the listing editor (ADR 0061);
    /// no product path sets it yet, so the store's value is set directly.
    /// </summary>
    public async Task LinkServiceAsync(Guid listing, Guid service)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var row = await db.DirectoryListings.SingleAsync(l => l.Id == listing, TestContext.Current.CancellationToken);
        db.Entry(row).Property(l => l.ServiceListingId).CurrentValue = service;
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
        string? photoKey = null,
        string description = "",
        string? website = null,
        DateTimeOffset? listedAt = null)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var listing = DirectoryListing.CreateDraft(Guid.CreateVersion7(), kind, name, tagline, area, focus ?? [], listedAt ?? Now, description, website, verified);
        listing.ShowPhoto(photoKey);
        switch (status)
        {
            case ListingStatus.Published:
                listing.Publish(listedAt ?? Now);
                break;
            case ListingStatus.Declined:
                listing.Decline();
                break;
            case ListingStatus.Removed:
                listing.Publish(listedAt ?? Now);
                listing.Remove();
                break;
            case ListingStatus.Draft:
                break;
        }

        db.DirectoryListings.Add(listing);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return listing.Id;
    }

    /// <summary>
    /// Makes <paramref name="member"/> the listing's owner, as a claim will (journeys 18 and 19); no
    /// product path sets an owner yet, so the store's value is set directly.
    /// </summary>
    public async Task OwnAsync(Guid listing, Guid member)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var row = await db.DirectoryListings.SingleAsync(l => l.Id == listing, TestContext.Current.CancellationToken);
        db.Entry(row).Property(l => l.MemberId).CurrentValue = member;
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>Suspends the member, as a moderator does.</summary>
    public async Task SuspendAsync(Guid member)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var row = await db.Members.SingleAsync(m => m.Id == member, TestContext.Current.CancellationToken);
        Assert.True(row.TrySuspend("Repeated harassment"));
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>Connects <paramref name="listing"/> to <paramref name="connected"/> as <paramref name="relation"/>, as staff will in the listing editor.</summary>
    public async Task AddConnectionAsync(Guid listing, Guid connected, string relation)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.ListingConnections.Add(ListingConnection.Of(Guid.CreateVersion7(), listing, connected, relation));
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>Puts an event hosted by <paramref name="host"/> in the store: published, a draft, or published then cancelled.</summary>
    public async Task<Guid> AddEventAsync(Guid host, DateTimeOffset startsAt, EventStatus status = EventStatus.Published, string title = "Saturday run")
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var e = Event.CreateDraft(title, EventCategory.Run, startsAt, "Martin Goodman Trail", "Waterfront, Toronto", 0, 20, "Come run with us.", Now);
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
        return e.Id;
    }
}
