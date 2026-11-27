namespace ChristianFitness.Domain.Events;

/// <summary>
/// How Home orders its suggested events (L2-065 AC7; ADR 0076): (1) events in the member's area or
/// GTA-wide before those in another area; then, within each, (2) events hosted by a listing the
/// member follows, (3) events matching one of their interests, (4) the rest; ties by date, soonest
/// first. A member with no area chosen skips (1).
/// </summary>
public static class HomeSuggestions
{
    /// <summary>An event that could be suggested: its start, its suggestion area (none is GTA-wide), its host and its category.</summary>
    public sealed record Candidate(Guid Id, string Title, DateTimeOffset StartsAt, string? SuggestionArea, Guid HostListingId, EventCategory Category);

    public static IReadOnlyList<Candidate> Rank(
        IEnumerable<Candidate> events,
        string? memberArea,
        IReadOnlyCollection<Guid> followedListings,
        IReadOnlyCollection<EventCategory> interestCategories)
    {
        ArgumentNullException.ThrowIfNull(events);
        ArgumentNullException.ThrowIfNull(followedListings);
        ArgumentNullException.ThrowIfNull(interestCategories);
        return [.. events
            .OrderBy(e => memberArea is null || e.SuggestionArea is null || string.Equals(e.SuggestionArea, memberArea, StringComparison.Ordinal) ? 0 : 1)
            .ThenBy(e => followedListings.Contains(e.HostListingId) ? 0 : interestCategories.Contains(e.Category) ? 1 : 2)
            .ThenBy(e => e.StartsAt)
            .ThenBy(e => e.Id)];
    }
}
