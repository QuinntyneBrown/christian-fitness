namespace ChristianFitness.Domain.Directory;

/// <summary>
/// A member's standing choice to hear first from one directory listing (L2-056; ADR 0088). It is
/// keyed by the pair, so following twice cannot make two; stopping deletes it. Only its count is
/// ever served to members (L2-056 AC6).
/// </summary>
public sealed class ListingFollow
{
    private ListingFollow()
    {
    }

    public Guid MemberId { get; private set; }

    public Guid ListingId { get; private set; }

    /// <summary>When the member followed it.</summary>
    public DateTimeOffset FollowedAt { get; private set; }

    /// <summary><paramref name="memberId"/> follows <paramref name="listingId"/> from <paramref name="at"/>.</summary>
    public static ListingFollow Of(Guid memberId, Guid listingId, DateTimeOffset at) =>
        new() { MemberId = memberId, ListingId = listingId, FollowedAt = at };
}
