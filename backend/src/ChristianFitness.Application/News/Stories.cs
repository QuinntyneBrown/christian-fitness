using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.News;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.News;

/// <summary>How the API names a story's status, section, placement and pointer: lower-case words the address and the app share (ADR 0097).</summary>
public static class StoryNames
{
    private static readonly Dictionary<string, StoryStatus> Statuses = new(StringComparer.Ordinal)
    {
        ["draft"] = StoryStatus.Draft,
        ["review"] = StoryStatus.InReview,
        ["scheduled"] = StoryStatus.Scheduled,
        ["published"] = StoryStatus.Published,
    };

    private static readonly Dictionary<string, StorySection> Sections = new(StringComparer.Ordinal)
    {
        ["events"] = StorySection.Events,
        ["training"] = StorySection.Training,
        ["nutrition"] = StorySection.Nutrition,
        ["faith-and-body"] = StorySection.FaithAndBody,
        ["community"] = StorySection.Community,
        ["pros"] = StorySection.Pros,
    };

    private static readonly Dictionary<string, StoryPlacement> Placements = new(StringComparer.Ordinal)
    {
        ["lead"] = StoryPlacement.Lead,
        ["top"] = StoryPlacement.Top,
        ["latest"] = StoryPlacement.Latest,
    };

    private static readonly Dictionary<string, StoryPointer> Pointers = new(StringComparer.Ordinal)
    {
        ["event"] = StoryPointer.Event,
        ["listing"] = StoryPointer.Listing,
    };

    public static StoryStatus? StatusOf(string? name) => name is not null && Statuses.TryGetValue(name, out var v) ? v : null;

    public static StorySection? SectionOf(string? name) => name is not null && Sections.TryGetValue(name, out var v) ? v : null;

    public static StoryPlacement? PlacementOf(string? name) => name is not null && Placements.TryGetValue(name, out var v) ? v : null;

    public static StoryPointer? PointerOf(string? name) => name is not null && Pointers.TryGetValue(name, out var v) ? v : null;

    public static string Of(StoryStatus status) => Statuses.Single(p => p.Value == status).Key;

    public static string Of(StorySection section) => Sections.Single(p => p.Value == section).Key;

    public static string Of(StoryPlacement placement) => Placements.Single(p => p.Value == placement).Key;

    public static string Of(StoryPointer target) => Pointers.Single(p => p.Value == target).Key;

    /// <summary>The section's name, or none.</summary>
    public static string? Of(StorySection? section) => section is { } s ? Of(s) : null;
}

/// <summary>How many stories each tab of Stories holds (L2-068 AC3).</summary>
public sealed record AdminStoryCountsDto(int All, int Draft, int Review, int Scheduled, int Published);

/// <summary>One story waiting for review, as its call-out names it (L2-068 AC2).</summary>
public sealed record AdminStoryReviewDto(Guid Id, string Headline, string? Byline, string? Section, DateTimeOffset SubmittedAt);

/// <summary>
/// One row of Stories (L2-068 AC1): the instant <c>when</c> is the edit of a Draft, the submission
/// of a story In review, the time of a Scheduled one or the publication of a Published one;
/// <c>reads</c> is none for a story never published (ADR 0097).
/// </summary>
public sealed record AdminStoryRowDto(Guid Id, string Headline, string? Byline, string? Section, string Status, DateTimeOffset When, int? Reads);

/// <summary>One page of Stories with every tab's count and the stories in review to call out.</summary>
public sealed record AdminStoryListDto(AdminStoryCountsDto Counts, IReadOnlyList<AdminStoryReviewDto> InReview, IReadOnlyList<AdminStoryRowDto> Items, int Page, int PageCount);

/// <summary>Stories for one tab (<c>status</c>: none for All, else a status name) and one page (L2-068 AC3, AC8).</summary>
public sealed record ListAdminStoriesQuery(string? Status, int? Page) : IRequest<AdminStoryListDto>
{
    public const int PageSize = 50;

    /// <summary>The call-outs above the list (L2-068 AC2).</summary>
    public const int ReviewCards = 3;
}

/// <summary>The field codes the stories endpoints refuse with, named in <c>fieldCodes</c> (ADR 0097).</summary>
public static class StoryRules
{
    public const string StatusInvalid = "status_invalid";
    public const string PageInvalid = "page_invalid";
    public const string SlugTaken = "slug_taken";
    public const string VersionRequired = "version_required";
    public const string ImageInvalid = "image_invalid";

    public static readonly IReadOnlySet<string> FieldCodes = new HashSet<string>(StringComparer.Ordinal)
    {
        StatusInvalid, PageInvalid,
        "headline_required", "headline_too_long", "summary_too_long", "text_required", "text_too_long",
        "section_required", "section_invalid", "byline_required", "byline_invalid", "placement_invalid",
        "points_to_invalid", "next_step_too_long", "next_step_link_invalid", "slug_invalid", "slug_taken",
        "image_invalid", "crop_invalid", "version_required",
    };
}

internal sealed class ListAdminStoriesValidator : AbstractValidator<ListAdminStoriesQuery>
{
    public ListAdminStoriesValidator()
    {
        RuleFor(q => q.Status)
            .Must(status => status is null or "all" || StoryNames.StatusOf(status) is not null)
            .WithErrorCode(StoryRules.StatusInvalid).WithMessage("Choose all, draft, review, scheduled or published");
        RuleFor(q => q.Page)
            .Must(page => page is null or >= 1)
            .WithErrorCode(StoryRules.PageInvalid).WithMessage("Choose a page from 1");
    }
}

/// <summary>
/// Counts every status, names the three stories longest in review, and reads one page of the tab,
/// newest activity first. No read is counted before the story page exists (journey 24), so a story
/// that has been published shows 0 reads and one never published none (ADR 0097).
/// </summary>
internal sealed class ListAdminStoriesHandler(IAppDbContext db) : IRequestHandler<ListAdminStoriesQuery, AdminStoryListDto>
{
    public async Task<AdminStoryListDto> Handle(ListAdminStoriesQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var counts = await db.Stories.AsNoTracking()
            .GroupBy(s => s.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        int CountOf(StoryStatus status) => counts.Where(c => c.Status == status).Sum(c => c.Count);

        var bylines = db.Bylines.AsNoTracking();
        var review = await db.Stories.AsNoTracking()
            .Where(s => s.Status == StoryStatus.InReview)
            .OrderBy(s => s.SubmittedAt).ThenBy(s => s.Id)
            .Take(ListAdminStoriesQuery.ReviewCards)
            .Select(s => new { s.Id, s.Headline, Byline = bylines.Where(b => b.Id == s.BylineId).Select(b => b.Name).FirstOrDefault(), s.Section, s.SubmittedAt })
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        var status = StoryNames.StatusOf(request.Status);
        var stories = db.Stories.AsNoTracking();
        if (status is { } only)
        {
            stories = stories.Where(s => s.Status == only);
        }

        var total = status is { } tab ? CountOf(tab) : counts.Sum(c => c.Count);
        var pageCount = Math.Max(1, (total + ListAdminStoriesQuery.PageSize - 1) / ListAdminStoriesQuery.PageSize);
        var page = request.Page ?? 1;
        var rows = await stories
            .OrderByDescending(s => s.ActivityAt).ThenByDescending(s => s.Id)
            .Skip((page - 1) * ListAdminStoriesQuery.PageSize)
            .Take(ListAdminStoriesQuery.PageSize)
            .Select(s => new
            {
                s.Id, s.Headline, s.Section, s.Status, s.EditedAt, s.SubmittedAt, s.PublishAt, s.PublishedAt, s.FirstPublishedAt,
                Byline = bylines.Where(b => b.Id == s.BylineId).Select(b => b.Name).FirstOrDefault(),
            })
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        return new AdminStoryListDto(
            new AdminStoryCountsDto(counts.Sum(c => c.Count), CountOf(StoryStatus.Draft), CountOf(StoryStatus.InReview), CountOf(StoryStatus.Scheduled), CountOf(StoryStatus.Published)),
            [.. review.Select(s => new AdminStoryReviewDto(s.Id, s.Headline, s.Byline, StoryNames.Of(s.Section), s.SubmittedAt!.Value))],
            [.. rows.Select(s => new AdminStoryRowDto(
                s.Id,
                s.Headline,
                s.Byline,
                StoryNames.Of(s.Section),
                StoryNames.Of(s.Status),
                s.Status switch
                {
                    StoryStatus.InReview => s.SubmittedAt!.Value,
                    StoryStatus.Scheduled => s.PublishAt!.Value,
                    StoryStatus.Published => s.PublishedAt!.Value,
                    _ => s.EditedAt,
                },
                s.FirstPublishedAt is null ? null : 0))],
            page,
            pageCount);
    }
}
