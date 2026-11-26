using ChristianFitness.Domain.News;

namespace ChristianFitness.Application.News;

/// <summary>
/// The API's kept feeds (L2-060 AC2; ADR 0072, ADR 0108): each rendered feed is kept under its path
/// as a tag, and a change readers would see in a feed evicts the feeds it touches.
/// </summary>
public interface IStoryFeedCache
{
    /// <summary>Evicts the feeds tagged <paramref name="tags"/>.</summary>
    Task EvictAsync(IReadOnlyCollection<string> tags, CancellationToken cancellationToken);
}

/// <summary>Which feeds a story's change touches, and evicting them.</summary>
internal static class FeedEviction
{
    /// <summary>
    /// The All stories feed and the feed of each of <paramref name="sections"/> that has one: the
    /// section a story was in and the one it is in now.
    /// </summary>
    public static IReadOnlyCollection<string> TagsOf(params StorySection?[] sections) =>
        [StoryFeeds.All.Path, .. sections.Select(StoryFeeds.BySection).OfType<FeedDefinition>().Select(f => f.Path).Distinct()];

    public static Task EvictAsync(this IStoryFeedCache cache, CancellationToken cancellationToken, params StorySection?[] sections) =>
        cache.EvictAsync(TagsOf(sections), cancellationToken);
}
