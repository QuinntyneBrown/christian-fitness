namespace ChristianFitness.Domain.News;

/// <summary>
/// One RSS feed (L2-060 AC1): its name, its path on the site and the section it carries, or none for
/// All stories.
/// </summary>
public sealed record FeedDefinition(string Name, string Path, StorySection? Section);

/// <summary>
/// The site's six feeds (L2-060 AC1; ADR 0072, ADR 0108): All stories at <c>/feed</c> and one per
/// section at <c>/&lt;slug&gt;/feed</c>. Pros has no feed of its own; its stories are in All stories.
/// </summary>
public static class StoryFeeds
{
    /// <summary>How many stories a feed carries, newest first.</summary>
    public const int ItemCount = 30;

    /// <summary>The feed of every section.</summary>
    public static readonly FeedDefinition All = new("All stories", "/feed", null);

    private static readonly Dictionary<string, FeedDefinition> Sections = new(StringComparer.Ordinal)
    {
        ["events"] = new("Events", "/events/feed", StorySection.Events),
        ["training"] = new("Training", "/training/feed", StorySection.Training),
        ["nutrition"] = new("Nutrition", "/nutrition/feed", StorySection.Nutrition),
        ["faith-body"] = new("Faith & Body", "/faith-body/feed", StorySection.FaithAndBody),
        ["community"] = new("Community", "/community/feed", StorySection.Community),
    };

    /// <summary>All stories first, then the section feeds in the front page's order.</summary>
    public static IReadOnlyList<FeedDefinition> Every { get; } = [All, .. Sections.Values];

    /// <summary>The feed of the section at <paramref name="slug"/>, or none for any other slug, Pros included.</summary>
    public static FeedDefinition? BySlug(string? slug) =>
        slug is not null && Sections.TryGetValue(slug, out var feed) ? feed : null;

    /// <summary>A section's name as readers see it, as a feed item's category.</summary>
    public static string SectionName(StorySection section) => section switch
    {
        StorySection.Events => "Events",
        StorySection.Training => "Training",
        StorySection.Nutrition => "Nutrition",
        StorySection.FaithAndBody => "Faith & Body",
        StorySection.Community => "Community",
        StorySection.Pros => "Pros",
        _ => throw new ArgumentOutOfRangeException(nameof(section), section, "A story sits in one of the six sections."),
    };
}
