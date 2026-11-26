using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.News;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.News;

/// <summary>
/// One story as the front page shows it (L2-001 AC2): its link, section, headline, summary (none
/// when it has none), author, publication and lead image. Nothing of a member (AC10).
/// </summary>
public sealed record StorySummaryDto(
    Guid Id,
    string Slug,
    string? Section,
    string Headline,
    string? Summary,
    string? Author,
    DateTimeOffset PublishedAt,
    StoryImageDto? Image);

/// <summary>
/// The front page (L2-001 AC2, AC3; ADR 0107): for Latest the lead and up to four headlines, then
/// one page of the river; for a section no lead, no headlines and that section's river. <c>More</c>
/// says whether older stories follow the page.
/// </summary>
public sealed record FrontPageDto(StorySummaryDto? Lead, IReadOnlyList<StorySummaryDto> Headlines, IReadOnlyList<StorySummaryDto> Latest, bool More);

/// <summary>
/// The front page of <paramref name="Section"/> (a section's name, or none for Latest), its river
/// from the <paramref name="Skip"/>th story after the top stories (ADR 0107).
/// </summary>
public sealed record ListFrontPageStoriesQuery(string? Section, int? Skip) : IRequest<FrontPageDto>
{
    /// <summary>How many headlines follow the lead.</summary>
    public const int HeadlineCount = 4;

    /// <summary>How many river stories one page holds.</summary>
    public const int PageSize = 12;

    /// <summary>How many river stories the page may hold in all, so the river stays bounded.</summary>
    public const int RiverMax = 60;
}

internal sealed class ListFrontPageStoriesValidator : AbstractValidator<ListFrontPageStoriesQuery>
{
    public ListFrontPageStoriesValidator()
    {
        RuleFor(q => q.Section)
            .Must(section => section is null || StoryNames.SectionOf(section) is not null)
            .WithErrorCode("section_invalid").WithMessage("Choose events, training, nutrition, faith-and-body, community or pros");
        RuleFor(q => q.Skip)
            .Must(skip => skip is null or >= 0 and <= ListFrontPageStoriesQuery.RiverMax - ListFrontPageStoriesQuery.PageSize)
            .WithErrorCode(StoryRules.SkipInvalid).WithMessage("Skip from 0 to 48 stories");
    }
}

/// <summary>
/// Reads the stories readers see now (ADR 0069), newest first, then by id (ADR 0107). For Latest the
/// lead is the story placed as the Lead, or the newest without one; the headlines are those placed in
/// Top headlines, filled with the newest others up to four, newest first; the river is the rest.
/// For a section the river is that section's stories. The river is read 12 at a time, one more to
/// know whether older ones follow.
/// </summary>
internal sealed class ListFrontPageStoriesHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<ListFrontPageStoriesQuery, FrontPageDto>
{
    public async Task<FrontPageDto> Handle(ListFrontPageStoriesQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var now = time.GetUtcNow();
        var section = StoryNames.SectionOf(request.Section);
        var readable = PublishedStories.At(db, now);
        if (section is not null)
        {
            readable = readable.Where(s => s.Section == section);
        }

        StorySummaryDto? lead = null;
        List<StorySummaryDto> headlines = [];
        if (section is null)
        {
            lead = await FrontPageStories.NewestAsync(db, readable.Where(s => s.Placement == StoryPlacement.Lead), cancellationToken).ConfigureAwait(false)
                ?? await FrontPageStories.NewestAsync(db, readable, cancellationToken).ConfigureAwait(false);
            var leadId = lead?.Id ?? Guid.Empty;
            headlines = [.. await FrontPageStories.ReadAsync(db, readable.Where(s => s.Id != leadId && s.Placement == StoryPlacement.Top), 0, ListFrontPageStoriesQuery.HeadlineCount, cancellationToken).ConfigureAwait(false)];
            if (headlines.Count < ListFrontPageStoriesQuery.HeadlineCount)
            {
                var taken = headlines.Select(h => h.Id).Append(leadId).ToList();
                headlines.AddRange(await FrontPageStories.ReadAsync(db, readable.Where(s => !taken.Contains(s.Id)), 0, ListFrontPageStoriesQuery.HeadlineCount - headlines.Count, cancellationToken).ConfigureAwait(false));
                headlines = [.. headlines.OrderByDescending(h => h.PublishedAt).ThenByDescending(h => h.Id)];
            }
        }

        var top = headlines.Select(h => h.Id).Append(lead?.Id ?? Guid.Empty).ToList();
        var river = await FrontPageStories.ReadAsync(db, readable.Where(s => !top.Contains(s.Id)), request.Skip ?? 0, ListFrontPageStoriesQuery.PageSize + 1, cancellationToken).ConfigureAwait(false);
        return new FrontPageDto(lead, headlines, [.. river.Take(ListFrontPageStoriesQuery.PageSize)], river.Count > ListFrontPageStoriesQuery.PageSize);
    }
}

/// <summary>Reads stories as the front page shows them, newest first, then by id (ADR 0107).</summary>
internal static class FrontPageStories
{
    /// <summary>The newest of <paramref name="stories"/>, or none.</summary>
    public static async Task<StorySummaryDto?> NewestAsync(IAppDbContext db, IQueryable<Story> stories, CancellationToken cancellationToken)
    {
        var found = await ReadAsync(db, stories, 0, 1, cancellationToken).ConfigureAwait(false);
        return found.Count == 0 ? null : found[0];
    }

    public static async Task<IReadOnlyList<StorySummaryDto>> ReadAsync(IAppDbContext db, IQueryable<Story> stories, int skip, int take, CancellationToken cancellationToken)
    {
        var bylines = db.Bylines.AsNoTracking();
        var rows = await stories
            .Select(s => new { Story = s, PublishedAt = s.Status == StoryStatus.Scheduled ? s.PublishAt : s.PublishedAt })
            .OrderByDescending(s => s.PublishedAt).ThenByDescending(s => s.Story.Id)
            .Skip(skip)
            .Take(take)
            .Select(s => new
            {
                s.Story.Id, s.Story.Slug, s.Story.Section, s.Story.Headline, s.Story.Summary, s.PublishedAt, s.Story.ImageKey, s.Story.ImageCrop,
                Author = bylines.Where(b => b.Id == s.Story.BylineId).Select(b => b.Name).FirstOrDefault(),
            })
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        return [.. rows.Select(s => new StorySummaryDto(
            s.Id,
            s.Slug!,
            StoryNames.Of(s.Section),
            s.Headline,
            string.IsNullOrWhiteSpace(s.Summary) ? null : s.Summary,
            s.Author,
            s.PublishedAt!.Value,
            s.ImageKey is { } key && s.ImageCrop is { } crop ? new StoryImageDto(key, new StoryCropDto(crop.X, crop.Y, crop.Width, crop.Height)) : null))];
    }
}
