using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.News;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.News;

/// <summary>
/// The card after a story's text (L2-069 AC1, L2-061 AC4): what it points to (<c>event</c>,
/// <c>listing</c>), the editor's words and where the card leads.
/// </summary>
public sealed record StoryNextDto(string Kind, string Text, string Link);

/// <summary>
/// A story as readers will see it, for Preview (L2-069 AC13; ADR 0097): whatever its status, the
/// section, headline, summary, author, publication, text, lead image and next step.
/// </summary>
public sealed record StoryPreviewDto(
    Guid Id,
    string Status,
    string? Section,
    string Headline,
    string Summary,
    string? Author,
    DateTimeOffset? PublishedAt,
    string Text,
    StoryImageDto? Image,
    StoryNextDto? Next);

/// <summary>Preview of one story, to Admins only; an unknown story is 404 <c>not_found</c>. Reads are not audited.</summary>
public sealed record GetStoryPreviewQuery(Guid Id) : IRequest<StoryPreviewDto>;

internal sealed class GetStoryPreviewHandler(IAppDbContext db) : IRequestHandler<GetStoryPreviewQuery, StoryPreviewDto>
{
    public async Task<StoryPreviewDto> Handle(GetStoryPreviewQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var story = await db.Stories.AsNoTracking().SingleOrDefaultAsync(s => s.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        var author = story.BylineId is { } bylineId
            ? await db.Bylines.AsNoTracking().Where(b => b.Id == bylineId).Select(b => b.Name).SingleOrDefaultAsync(cancellationToken).ConfigureAwait(false)
            : null;
        var answer = StoryAnswers.Of(story);
        var next = await NextOfAsync(story, cancellationToken).ConfigureAwait(false);
        return new StoryPreviewDto(
            story.Id,
            answer.Status,
            answer.Section,
            story.Headline,
            story.Summary,
            author,
            story.PublishedAt,
            story.Text,
            answer.Image,
            next);
    }

    /// <summary>
    /// The card after the text (L2-061 AC4): only with "Next step" words and a published event or
    /// listing to point to, leading to the editor's link or else that event's or listing's page.
    /// </summary>
    private async Task<StoryNextDto?> NextOfAsync(Story story, CancellationToken cancellationToken)
    {
        if (story.NextStepText is not { } words || story.PointsToId is not { } id)
        {
            return null;
        }

        var (published, page) = story.PointsTo switch
        {
            StoryPointer.Event => (await db.Events.AnyAsync(e => e.Id == id && e.Status == EventStatus.Published, cancellationToken).ConfigureAwait(false), $"/events/{id}"),
            StoryPointer.Listing => (await db.DirectoryListings.AnyAsync(l => l.Id == id && l.Status == ListingStatus.Published, cancellationToken).ConfigureAwait(false), $"/directory/{id}"),
            _ => (false, string.Empty),
        };
        return published ? new StoryNextDto(StoryNames.Of(story.PointsTo), words, story.NextStepLink ?? page) : null;
    }
}
