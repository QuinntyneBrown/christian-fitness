namespace ChristianFitness.Domain.Members;

/// <summary>
/// The activities a member can follow, by key (ADR 0007). The member app lists the same keys, with
/// their labels, in <c>INTERESTS</c> of <c>@cf/api</c>.
/// </summary>
public static class Interests
{
    public static IReadOnlyList<string> All { get; } =
        ["running", "strength", "basketball", "walking-groups", "mobility", "nutrition", "cycling", "retreats", "pickleball"];
}
