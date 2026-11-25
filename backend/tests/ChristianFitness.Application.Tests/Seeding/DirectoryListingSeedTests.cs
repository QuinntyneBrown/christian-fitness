using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Seeding;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Application.Tests.Seeding;

/// <summary>
/// L2-054 AC10 (ADR 0067, ADR 0082, ADR 0087): the seed adds the Listed Christian Fitness team listing
/// by its stable id, the sample listings and their connections only when asked, and a second run
/// changes nothing.
/// </summary>
public sealed class DirectoryListingSeedTests : IDisposable
{
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 11, 25, 9, 0, 0, TimeSpan.Zero));
    private readonly AppDbContext _db = new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase($"directory-seed-{Guid.NewGuid():N}").Options);

    [Fact]
    public async Task Given_an_empty_directory_When_seed_runs_without_samples_Then_only_the_published_team_listing_is_added()
    {
        var changes = await RunnerFor(DirectoryListingSeed.Team).RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(1, changes);
        var team = Assert.Single(await _db.DirectoryListings.ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal(
            (DirectoryListing.TeamListingId, ListingKind.Organization, "Christian Fitness", ListingStatus.Published, true, _time.GetUtcNow()),
            (team.Id, team.Kind, team.Name, team.Status, team.IsVerified, team.ListedAt));
        Assert.Equal("christian fitness", team.NameKey);
    }

    [Fact]
    public async Task Given_samples_asked_for_When_seed_runs_Then_twelve_published_listings_of_every_kind_are_added()
    {
        var changes = await RunnerFor([DirectoryListingSeed.Team, .. DirectoryListingSeed.Samples]).RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(12, changes);
        var listings = await _db.DirectoryListings.ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(12, listings.Select(l => l.Id).Distinct().Count());
        Assert.All(listings, l => Assert.Equal(ListingStatus.Published, l.Status));
        Assert.Equal(Enum.GetValues<ListingKind>(), listings.Select(l => l.Kind).Distinct().Order());
        Assert.Equal(["Northline Athletic"], listings.Where(l => !l.IsVerified).Select(l => l.Name));
    }

    [Fact]
    public async Task Given_a_seeded_directory_When_seed_runs_again_Then_it_changes_nothing()
    {
        SeedListing[] all = [DirectoryListingSeed.Team, .. DirectoryListingSeed.Samples];
        await RunnerFor(all).RunAsync(TestContext.Current.CancellationToken);
        var first = await _db.DirectoryListings.AsNoTracking().OrderBy(l => l.Id).Select(l => new { l.Id, l.Name, l.ListedAt }).ToListAsync(TestContext.Current.CancellationToken);
        _time.Advance(TimeSpan.FromDays(1));

        var changes = await RunnerFor(all).RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(0, changes);
        var again = await _db.DirectoryListings.AsNoTracking().OrderBy(l => l.Id).Select(l => new { l.Id, l.Name, l.ListedAt }).ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(first, again);
    }

    [Fact]
    public async Task Given_samples_asked_for_When_seed_runs_Then_the_mocks_connections_are_added_once_each()
    {
        var changes = await SamplesWithConnections().RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(12 + 21, changes);
        var lakeshore = await (
            from c in _db.ListingConnections
            join other in _db.DirectoryListings on c.ConnectedListingId equals other.Id
            join self in _db.DirectoryListings on c.ListingId equals self.Id
            where self.Name == "Lakeshore Runners Fellowship"
            orderby other.Name
            select new { other.Name, c.Relation }).ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(
            [new { Name = "Michael Chen", Relation = "Run leader" }, new { Name = "Northline Athletic", Relation = "Shoe partner" }],
            lakeshore);

        Assert.Equal(0, await SamplesWithConnections().RunAsync(TestContext.Current.CancellationToken));
        Assert.Equal(21, await _db.ListingConnections.CountAsync(TestContext.Current.CancellationToken));
    }

    public void Dispose() => _db.Dispose();

    private SeedRunner RunnerFor(params SeedListing[] listings)
    {
        _db.ChangeTracker.Clear();
        IAppDbContext db = _db;
        return new SeedRunner([.. listings.Select(l => new DirectoryListingSeed(l, _time))], db);
    }

    private SeedRunner SamplesWithConnections()
    {
        _db.ChangeTracker.Clear();
        IAppDbContext db = _db;
        return new SeedRunner(
            [
                .. new[] { DirectoryListingSeed.Team }.Concat(DirectoryListingSeed.Samples).Select(l => new DirectoryListingSeed(l, _time)),
                .. ListingConnectionSeed.Samples.Select(c => new ListingConnectionSeed(c)),
            ],
            db);
    }
}
