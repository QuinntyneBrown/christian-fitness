using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Directory;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Seeding;

/// <summary>One seeded connection: a listing, the listing it is connected to, and the relation from its side.</summary>
public sealed record SeedConnection(Guid Id, Guid ListingId, Guid ConnectedListingId, string Relation);

/// <summary>
/// One connection between two seeded listings, keyed by the pair: added when missing, never changed
/// when present, so a second run changes nothing (ADR 0085). It stands in for the listing editors'
/// connections until they exist, and is seeded only beside the sample listings.
/// </summary>
public sealed class ListingConnectionSeed(SeedConnection connection) : ISeed
{
    public string Key => $"listing connection {connection.Id}";

    public Task<bool> ExistsAsync(IAppDbContext db, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);
        return db.ListingConnections.AnyAsync(
            c => c.ListingId == connection.ListingId && c.ConnectedListingId == connection.ConnectedListingId, cancellationToken);
    }

    public void Apply(IAppDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
        db.ListingConnections.Add(ListingConnection.Of(connection.Id, connection.ListingId, connection.ConnectedListingId, connection.Relation));
    }

    // Declared before Samples: static fields are set in the order they are written.
    private static readonly Guid Team = DirectoryListing.TeamListingId;
    private static readonly Guid Lakeshore = DirectoryListingSeed.SampleId(1);
    private static readonly Guid FaithFootwork = DirectoryListingSeed.SampleId(2);
    private static readonly Guid Whitfield = DirectoryListingSeed.SampleId(3);
    private static readonly Guid Okafor = DirectoryListingSeed.SampleId(4);
    private static readonly Guid Grant = DirectoryListingSeed.SampleId(5);
    private static readonly Guid Chen = DirectoryListingSeed.SampleId(6);
    private static readonly Guid Nair = DirectoryListingSeed.SampleId(7);
    private static readonly Guid KingdomFuel = DirectoryListingSeed.SampleId(8);
    private static readonly Guid Northline = DirectoryListingSeed.SampleId(9);
    private static readonly Guid GraceMove = DirectoryListingSeed.SampleId(10);
    private static readonly Guid StPauls = DirectoryListingSeed.SampleId(11);

    /// <summary>
    /// The mocks' connections between the team listing and the sample listings (docs/mocks/tools/cf_data.py),
    /// seeded only when <c>Seed__DirectorySamples</c> is <c>true</c>.
    /// </summary>
    public static readonly IReadOnlyList<SeedConnection> Samples = Build(
    [
        (Team, Chen, "Ambassador"), (Team, Nair, "Ambassador"), (Team, KingdomFuel, "Sponsor"),
        (Lakeshore, Chen, "Run leader"), (Lakeshore, Northline, "Shoe partner"),
        (GraceMove, Whitfield, "Pastor"),
        (StPauls, Grant, "Head coach"),
        (Okafor, Team, "Event partner"), (Okafor, Northline, "Sponsored by"),
        (Grant, FaithFootwork, "Founder"), (Grant, StPauls, "Head coach"),
        (FaithFootwork, Grant, "Founder"), (FaithFootwork, Nair, "Ambassador"),
        (Chen, Team, "Ambassador for"), (Chen, Lakeshore, "Run leader"),
        (Nair, Team, "Ambassador for"), (Nair, FaithFootwork, "Ambassador for"),
        (Whitfield, GraceMove, "Pastor at"),
        (KingdomFuel, Team, "Sponsor of"),
        (Northline, Lakeshore, "Shoe partner"), (Northline, Okafor, "Sponsor"),
    ]);

    private static SeedConnection[] Build((Guid Listing, Guid Connected, string Relation)[] pairs) =>
        [.. pairs.Select((pair, n) => new SeedConnection(new Guid($"0193a9c0-0000-7000-8000-0000000c{n + 1:x4}"), pair.Listing, pair.Connected, pair.Relation))];
}
