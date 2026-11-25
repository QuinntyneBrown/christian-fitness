namespace ChristianFitness.Domain.Directory;

/// <summary>
/// One listing's relation to another, worded from the first listing's side, such as "Run leader"
/// (L2-054 AC10, L2-055 AC4; ADR 0087). A relation is stored per direction, so the same pair may be
/// worded differently each way. Staff and the owner set them in the listing editors.
/// </summary>
public sealed class ListingConnection
{
    public const int RelationMaxLength = 60;

    private ListingConnection()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The listing whose profile shows the connection.</summary>
    public Guid ListingId { get; private set; }

    /// <summary>The listing it is connected to.</summary>
    public Guid ConnectedListingId { get; private set; }

    /// <summary>The relation in words, 1 to <see cref="RelationMaxLength"/> characters.</summary>
    public string Relation { get; private set; } = string.Empty;

    /// <summary>Connects <paramref name="listingId"/> to another listing, as <paramref name="relation"/>.</summary>
    public static ListingConnection Of(Guid id, Guid listingId, Guid connectedListingId, string relation)
    {
        ArgumentNullException.ThrowIfNull(relation);
        var trimmed = relation.Trim();
        if (trimmed.Length is 0 or > RelationMaxLength)
        {
            throw new ArgumentOutOfRangeException(nameof(relation), "A relation is 1 to 60 characters.");
        }

        if (listingId == connectedListingId)
        {
            throw new ArgumentException("A listing is not connected to itself.", nameof(connectedListingId));
        }

        return new ListingConnection { Id = id, ListingId = listingId, ConnectedListingId = connectedListingId, Relation = trimmed };
    }
}
