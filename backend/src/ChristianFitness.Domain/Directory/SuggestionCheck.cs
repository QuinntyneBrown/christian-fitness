namespace ChristianFitness.Domain.Directory;

/// <summary>
/// One of a suggestion's four checks once staff first set it (L2-073 AC4; ADR 0087): whether it
/// passed, who last changed it and when. A check with no row has not passed.
/// </summary>
public sealed class SuggestionCheck
{
    private SuggestionCheck()
    {
    }

    public Guid SuggestionId { get; private set; }

    public ListingCheck Check { get; private set; }

    public bool Passed { get; private set; }

    public Guid ChangedById { get; private set; }

    public DateTimeOffset ChangedAt { get; private set; }

    public static SuggestionCheck Set(Guid suggestionId, ListingCheck check, bool passed, Guid changedById, DateTimeOffset changedAt) =>
        new() { SuggestionId = suggestionId, Check = check, Passed = passed, ChangedById = changedById, ChangedAt = changedAt };

    /// <summary>Sets the check to <paramref name="passed"/>; false when it already was, and nothing changes.</summary>
    public bool Change(bool passed, Guid changedById, DateTimeOffset changedAt)
    {
        if (Passed == passed)
        {
            return false;
        }

        Passed = passed;
        ChangedById = changedById;
        ChangedAt = changedAt;
        return true;
    }
}
