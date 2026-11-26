using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.News;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.News;

/// <summary>
/// A Published story as anyone reads it at <c>/stories/&lt;slug&gt;</c> (L2-061 AC1; ADR 0105):
/// its current <c>slug</c>, section, headline, summary, author, publication, the text as written
/// for the app's one renderer, the lead image and the next step card.
/// </summary>
public sealed record PublishedStoryDto(
    Guid Id,
    string Slug,
    string? Section,
    string Headline,
    string Summary,
    string? Author,
    DateTimeOffset PublishedAt,
    string Text,
    StoryImageDto? Image,
    StoryNextDto? Next,
    IReadOnlyList<StoryCardDto> KeepReading)
{
    /// <summary>How many other stories "Keep reading" holds.</summary>
    public const int KeepReadingCount = 3;
}

/// <summary>One "Keep reading" card (L2-061 AC6): image, section, title, author and age, leading to the story.</summary>
public sealed record StoryCardDto(string Slug, string? Section, string Headline, string? Author, DateTimeOffset PublishedAt, StoryImageDto? Image);

/// <summary>
/// The Published story whose link, current or former, is <paramref name="Slug"/>; anything else is
/// 404 <c>not_found</c> with nothing of the story (L2-061 AC7, AC8).
/// </summary>
public sealed record GetPublishedStoryQuery(string Slug) : IRequest<PublishedStoryDto>;

internal sealed class GetPublishedStoryHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<GetPublishedStoryQuery, PublishedStoryDto>
{
    public async Task<PublishedStoryDto> Handle(GetPublishedStoryQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var now = time.GetUtcNow();
        var story = await PublishedStories.FindAsync(db, request.Slug, now, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        var author = story.BylineId is { } bylineId
            ? await db.Bylines.AsNoTracking().Where(b => b.Id == bylineId).Select(b => b.Name).SingleOrDefaultAsync(cancellationToken).ConfigureAwait(false)
            : null;
        var answer = StoryAnswers.Of(story, now);
        return new PublishedStoryDto(
            story.Id,
            story.Slug!,
            answer.Section,
            story.Headline,
            story.Summary,
            author,
            story.EffectivePublishedAt(now)!.Value,
            story.Text,
            answer.Image,
            await StoryNext.OfAsync(db, story, cancellationToken).ConfigureAwait(false),
            await KeepReadingAsync(story, now, cancellationToken).ConfigureAwait(false));
    }

    /// <summary>Three other Published stories: the same section first, then the rest, each newest first (L2-061 AC6).</summary>
    private async Task<IReadOnlyList<StoryCardDto>> KeepReadingAsync(Story story, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var bylines = db.Bylines.AsNoTracking();
        var others = await PublishedStories.At(db, now)
            .Where(s => s.Id != story.Id)
            .Select(s => new { Story = s, PublishedAt = s.Status == StoryStatus.Scheduled ? s.PublishAt : s.PublishedAt })
            .OrderByDescending(s => s.Story.Section == story.Section).ThenByDescending(s => s.PublishedAt).ThenByDescending(s => s.Story.Id)
            .Take(PublishedStoryDto.KeepReadingCount)
            .Select(s => new
            {
                s.Story.Slug, s.Story.Section, s.Story.Headline, s.PublishedAt, s.Story.ImageKey, s.Story.ImageCrop,
                Author = bylines.Where(b => b.Id == s.Story.BylineId).Select(b => b.Name).FirstOrDefault(),
            })
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        return [.. others.Select(s => new StoryCardDto(
            s.Slug!,
            StoryNames.Of(s.Section),
            s.Headline,
            s.Author,
            s.PublishedAt!.Value,
            s.ImageKey is { } key && s.ImageCrop is { } crop ? new StoryImageDto(key, new StoryCropDto(crop.X, crop.Y, crop.Width, crop.Height)) : null))];
    }
}

/// <summary>
/// The stories readers see at <c>now</c>: Published ones and Scheduled ones whose time has come
/// (ADR 0069). Publication is checked before a former link is honoured (ADR 0073).
/// </summary>
public static class PublishedStories
{
    /// <summary>Every story readers see at <paramref name="now"/>, with a link.</summary>
    public static IQueryable<Story> At(IAppDbContext db, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(db);
        return db.Stories.AsNoTracking()
            .Where(s => (s.Status == StoryStatus.Published || (s.Status == StoryStatus.Scheduled && s.PublishAt <= now)) && s.Slug != null);
    }

    /// <summary>The story readers see at <paramref name="now"/> whose current or former link is <paramref name="slug"/>, or none.</summary>
    public static async Task<Story?> FindAsync(IAppDbContext db, string slug, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (!StorySlug.IsValid(slug))
        {
            return null;
        }

        var published = At(db, now);
        return await published.SingleOrDefaultAsync(s => s.Slug == slug, cancellationToken).ConfigureAwait(false)
            ?? await published.FirstOrDefaultAsync(s => s.FormerSlugs.Contains(slug), cancellationToken).ConfigureAwait(false);
    }
}
