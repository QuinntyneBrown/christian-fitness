using ChristianFitness.Domain.Events;

namespace ChristianFitness.Domain.Members;

/// <summary>
/// Which kinds of event suit each interest (L2-007 AC1; ADR 0044): the rule Home uses to suggest
/// events. Every key of <see cref="Interests.All"/> names exactly one category.
/// </summary>
public static class InterestCategories
{
    private static readonly Dictionary<string, EventCategory> ByInterest = new(StringComparer.Ordinal)
    {
        ["running"] = EventCategory.Run,
        ["walking-groups"] = EventCategory.Run,
        ["strength"] = EventCategory.Workout,
        ["cycling"] = EventCategory.Workout,
        ["pickleball"] = EventCategory.Workout,
        ["basketball"] = EventCategory.Basketball,
        ["mobility"] = EventCategory.Mobility,
        ["nutrition"] = EventCategory.Workshop,
        ["retreats"] = EventCategory.Retreat,
    };

    /// <summary>The distinct categories the <paramref name="interests"/> name; a key this app does not know names none.</summary>
    public static IReadOnlyList<EventCategory> For(IEnumerable<string> interests) =>
        [.. interests.Where(ByInterest.ContainsKey).Select(i => ByInterest[i]).Distinct()];
}
