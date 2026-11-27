namespace ChristianFitness.Domain.Events;

/// <summary>
/// How Home orders its suggested events (L2-065 AC7; ADR 0076): (1) events in the member's area or
/// GTA-wide before those in another area; then, within each, (2) new events of a listing the member
/// follows, (3) events matching one of their interests, (4) the rest; ties by date, soonest first.
/// A member with no area chosen skips (1). An event of a followed listing is new when it was
/// published after the member followed the listing and they have not opened it (L2-056 AC7;
/// ADR 0116).
/// </summary>
public static class HomeSuggestions
{
    /// <summary>
    /// An event that could be suggested: its start, its suggestion area (none is GTA-wide), its host,
    /// its category and when it was published (none when not recorded).
    /// </summary>
    public sealed record Candidate(Guid Id, string Title, DateTimeOffset StartsAt, string? SuggestionArea, Guid HostListingId, EventCategory Category, DateTimeOffset? PublishedAt);

    /// <param name="events">The candidates.</param>
    /// <param name="memberArea">The member's area, or none.</param>
    /// <param name="follows">Each listing the member follows, with when they followed it.</param>
    /// <param name="seen">The events the member has opened.</param>
    /// <param name="interestCategories">The categories the member's interests name.</param>
    public static IReadOnlyList<Candidate> Rank(
        IEnumerable<Candidate> events,
        string? memberArea,
        IReadOnlyDictionary<Guid, DateTimeOffset> follows,
        IReadOnlyCollection<Guid> seen,
        IReadOnlyCollection<EventCategory> interestCategories)
    {
        ArgumentNullException.ThrowIfNull(events);
        ArgumentNullException.ThrowIfNull(follows);
        ArgumentNullException.ThrowIfNull(seen);
        ArgumentNullException.ThrowIfNull(interestCategories);
        bool IsNewFromFollowed(Candidate e) =>
            follows.TryGetValue(e.HostListingId, out var since) && e.PublishedAt > since && !seen.Contains(e.Id);
        return [.. events
            .OrderBy(e => memberArea is null || e.SuggestionArea is null || string.Equals(e.SuggestionArea, memberArea, StringComparison.Ordinal) ? 0 : 1)
            .ThenBy(e => IsNewFromFollowed(e) ? 0 : interestCategories.Contains(e.Category) ? 1 : 2)
            .ThenBy(e => e.StartsAt)
            .ThenBy(e => e.Id)];
    }
}
