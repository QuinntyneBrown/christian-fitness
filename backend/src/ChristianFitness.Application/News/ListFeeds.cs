using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Email;
using ChristianFitness.Domain.News;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.News;

/// <summary>
/// One feed as Subscribe lists it (L2-060 AC4; ADR 0110): its name, its address, about how many
/// stories it carried a week over the last 28 days, and whether it is All stories.
/// </summary>
public sealed record FeedSummaryDto(string Name, Uri Url, int StoriesPerWeek, bool IsAll);

/// <summary>Subscribe's feed list: All stories first, then the five section feeds (L2-060 AC4).</summary>
public sealed record ListFeedsQuery : IRequest<IReadOnlyList<FeedSummaryDto>>;

internal sealed class ListFeedsHandler(IAppDbContext db, MemberAppAddress app, TimeProvider time)
    : IRequestHandler<ListFeedsQuery, IReadOnlyList<FeedSummaryDto>>
{
    /// <summary>How far back a feed's weekly count looks: four weeks.</summary>
    internal static readonly TimeSpan Window = TimeSpan.FromDays(28);

    public async Task<IReadOnlyList<FeedSummaryDto>> Handle(ListFeedsQuery request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var since = now - Window;
        var counts = await PublishedStories.At(db, now)
            .Select(s => new { s.Section, PublishedAt = s.Status == StoryStatus.Scheduled ? s.PublishAt : s.PublishedAt })
            .Where(s => s.PublishedAt > since)
            .GroupBy(s => s.Section)
            .Select(g => new { Section = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var root = $"{app.BaseUrl.GetLeftPart(UriPartial.Authority)}{app.BaseUrl.AbsolutePath.TrimEnd('/')}";
        return [.. StoryFeeds.Every.Select(feed => new FeedSummaryDto(
            feed.Name,
            new Uri(root + feed.Path),
            PerWeek(counts.Where(c => feed.Section is null || c.Section == feed.Section).Sum(c => c.Count)),
            feed.Section is null))];
    }

    /// <summary>A four-week count as a weekly one, to the nearest whole story, halves up.</summary>
    private static int PerWeek(int count) => (int)Math.Round(count / 4m, MidpointRounding.AwayFromZero);
}
