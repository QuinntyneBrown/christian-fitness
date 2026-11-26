using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Email;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.News;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.News;

/// <summary>One story in a feed (L2-060 AC1): nothing in it identifies or reaches a member (AC6).</summary>
public sealed record FeedItem(Guid Id, string Title, Uri Link, string Summary, string? Section, string? Author, DateTimeOffset PublishedAt);

/// <summary>A feed as the API writes it: its name, its own address, the site's, and its items newest first.</summary>
public sealed record StoryFeed(string Title, Uri Self, Uri Site, IReadOnlyList<FeedItem> Items);

/// <summary>
/// The feed at <c>/feed</c> (<paramref name="Section"/> none) or <c>/&lt;section&gt;/feed</c> (L2-060
/// AC1, AC6; ADR 0108): the <see cref="StoryFeeds.ItemCount"/> newest stories readers see now, with
/// Scheduled ones whose time has come (ADR 0069). An unknown section, Pros included, is 404
/// <c>not_found</c>.
/// </summary>
public sealed record GetStoryFeedQuery(string? Section) : IRequest<StoryFeed>;

internal sealed class GetStoryFeedHandler(IAppDbContext db, MemberAppAddress app, TimeProvider time) : IRequestHandler<GetStoryFeedQuery, StoryFeed>
{
    public async Task<StoryFeed> Handle(GetStoryFeedQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var feed = request.Section is null
            ? StoryFeeds.All
            : StoryFeeds.BySlug(request.Section) ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        var now = time.GetUtcNow();
        var stories = PublishedStories.At(db, now);
        if (feed.Section is { } section)
        {
            stories = stories.Where(s => s.Section == section);
        }

        var bylines = db.Bylines.AsNoTracking();
        var rows = await stories
            .Select(s => new { Story = s, PublishedAt = s.Status == StoryStatus.Scheduled ? s.PublishAt : s.PublishedAt })
            .OrderByDescending(s => s.PublishedAt).ThenByDescending(s => s.Story.Id)
            .Take(StoryFeeds.ItemCount)
            .Select(s => new
            {
                s.Story.Id, s.Story.Slug, s.Story.Headline, s.Story.Summary, s.Story.Section, s.PublishedAt,
                Author = bylines.Where(b => b.Id == s.Story.BylineId).Select(b => b.Name).FirstOrDefault(),
            })
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        var root = $"{app.BaseUrl.GetLeftPart(UriPartial.Authority)}{app.BaseUrl.AbsolutePath.TrimEnd('/')}";
        return new StoryFeed(
            $"Christian Fitness: {feed.Name}",
            new Uri(root + feed.Path),
            new Uri(root + "/"),
            [.. rows.Select(r => new FeedItem(
                r.Id,
                r.Headline,
                new Uri($"{root}/stories/{Uri.EscapeDataString(r.Slug!)}"),
                r.Summary,
                r.Section is { } s ? StoryFeeds.SectionName(s) : null,
                r.Author,
                r.PublishedAt!.Value))]);
    }
}
