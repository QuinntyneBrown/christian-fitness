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

internal sealed class GetPublishedStoryHandler(IAppDbContext db) : IRequestHandler<GetPublishedStoryQuery, PublishedStoryDto>
{
    public async Task<PublishedStoryDto> Handle(GetPublishedStoryQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var story = await PublishedStories.FindAsync(db, request.Slug, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        var author = story.BylineId is { } bylineId
            ? await db.Bylines.AsNoTracking().Where(b => b.Id == bylineId).Select(b => b.Name).SingleOrDefaultAsync(cancellationToken).ConfigureAwait(false)
            : null;
        var answer = StoryAnswers.Of(story);
        return new PublishedStoryDto(
            story.Id,
            story.Slug!,
            answer.Section,
            story.Headline,
            story.Summary,
            author,
            story.PublishedAt!.Value,
            story.Text,
            answer.Image,
            await StoryNext.OfAsync(db, story, cancellationToken).ConfigureAwait(false),
            await KeepReadingAsync(story, cancellationToken).ConfigureAwait(false));
    }

    /// <summary>Three other Published stories: the same section first, then the rest, each newest first (L2-061 AC6).</summary>
    private async Task<IReadOnlyList<StoryCardDto>> KeepReadingAsync(Story story, CancellationToken cancellationToken)
    {
        var bylines = db.Bylines.AsNoTracking();
        var others = await db.Stories.AsNoTracking()
            .Where(s => s.Status == StoryStatus.Published && s.Slug != null && s.Id != story.Id)
            .OrderByDescending(s => s.Section == story.Section).ThenByDescending(s => s.PublishedAt).ThenByDescending(s => s.Id)
            .Take(PublishedStoryDto.KeepReadingCount)
            .Select(s => new
            {
                s.Slug, s.Section, s.Headline, s.PublishedAt, s.ImageKey, s.ImageCrop,
                Author = bylines.Where(b => b.Id == s.BylineId).Select(b => b.Name).FirstOrDefault(),
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

/// <summary>Finds a Published story by its link; publication is checked before a former link is honoured (ADR 0073).</summary>
public static class PublishedStories
{
    /// <summary>The Published story whose current or former link is <paramref name="slug"/>, or none.</summary>
    public static async Task<Story?> FindAsync(IAppDbContext db, string slug, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);
        if (!StorySlug.IsValid(slug))
        {
            return null;
        }

        var published = db.Stories.AsNoTracking().Where(s => s.Status == StoryStatus.Published && s.Slug != null);
        return await published.SingleOrDefaultAsync(s => s.Slug == slug, cancellationToken).ConfigureAwait(false)
            ?? await published.FirstOrDefaultAsync(s => s.FormerSlugs.Contains(slug), cancellationToken).ConfigureAwait(false);
    }
}
