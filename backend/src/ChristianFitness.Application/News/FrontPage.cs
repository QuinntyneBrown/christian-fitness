using System.Globalization;
using System.Text;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Events;
using ChristianFitness.Domain.News;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.News;

/// <summary>
/// How a section is spelled in a reader's address and answers (ADR 0071): the slug of its name, as
/// in <c>/?section=faith-body</c> and <c>/faith-body/feed</c>. The console's own names differ
/// (<see cref="StoryNames"/>, ADR 0097).
/// </summary>
public static class StorySections
{
    private static readonly Dictionary<StorySection, string> Slugs = new()
    {
        [StorySection.Events] = "events",
        [StorySection.Training] = "training",
        [StorySection.Nutrition] = "nutrition",
        [StorySection.FaithAndBody] = "faith-body",
        [StorySection.Community] = "community",
        [StorySection.Pros] = "pros",
    };

    public static string SlugOf(StorySection section) => Slugs[section];

    /// <summary>The section an exact slug names, or none: another case or the console's name is not one.</summary>
    public static StorySection? SectionOf(string? slug) =>
        slug is null ? null : Slugs.Where(pair => pair.Value == slug).Select(pair => (StorySection?)pair.Key).FirstOrDefault();
}

/// <summary>
/// A story as the front page shows it (L2-001 AC2, AC10; ADR 0105): its link, section slug,
/// headline, summary (none when it has none), the name of its byline, when it went out and the key
/// of its lead image, served by <c>GET /api/stories/images/{key}</c>. Nothing names or reaches a member.
/// </summary>
public sealed record StorySummaryDto(
    Guid Id,
    string Slug,
    string Section,
    string Headline,
    string? Summary,
    string Byline,
    DateTimeOffset PublishedAt,
    string? ImageKey);

/// <summary>
/// The front page (L2-001 AC2 to AC5; ADR 0105): the lead story or none, at most
/// <see cref="ListFrontPageStoriesQuery.HeadlineCount"/> headlines, one page of the river with the
/// cursor of the next or none, and the most-read stories, which stay empty until reads are counted
/// (journey 24).
/// </summary>
public sealed record FrontPageDto(
    StorySummaryDto? Lead,
    IReadOnlyList<StorySummaryDto> Headlines,
    IReadOnlyList<StorySummaryDto> Latest,
    string? NextCursor,
    IReadOnlyList<StorySummaryDto> MostRead);

/// <summary>
/// The stories a visitor's front page shows (L2-001 AC2, AC3; ADR 0105): every section together
/// ("Latest"), or only the one <paramref name="Section"/> names by its slug (ADR 0071), the river
/// <see cref="PageSize"/> at a time after the opaque <paramref name="Cursor"/> and
/// <see cref="RiverMax"/> in all (L2-037).
/// </summary>
public sealed record ListFrontPageStoriesQuery(string? Section = null, string? Cursor = null) : IRequest<FrontPageDto>
{
    /// <summary>The headlines beside the lead story (L2-001 AC2).</summary>
    public const int HeadlineCount = 4;

    /// <summary>The river's stories in one answer.</summary>
    public const int PageSize = 12;

    /// <summary>The most stories of the river a reader pages through (L2-037).</summary>
    public const int RiverMax = 60;
}

/// <summary>
/// A section this API does not know, or a cursor it did not write, is refused with 400
/// <c>validation_failed</c>, its field named <c>section_invalid</c> or <c>cursor_invalid</c>; the
/// page never sends such a section, since it shows Latest instead (L2-001 AC3).
/// </summary>
public sealed class ListFrontPageStoriesValidator : AbstractValidator<ListFrontPageStoriesQuery>
{
    public const string SectionInvalid = "section_invalid";

    public ListFrontPageStoriesValidator()
    {
        RuleFor(q => q.Section)
            .Must(section => section is null || StorySections.SectionOf(section) is not null)
            .WithMessage("Choose one of the sections")
            .WithErrorCode(SectionInvalid);
        RuleFor(q => q.Cursor)
            .Must(cursor => cursor is null || FrontPageCursor.TryParse(cursor, out _))
            .WithMessage("The list could not continue")
            .WithErrorCode(EventFieldCodes.CursorInvalid);
    }
}

/// <summary>
/// Where a page of the river ended (ADR 0105): the publish time and id of its last story, how many
/// stories of the river the reader has been given, and the lead and headlines of the first page,
/// which the river leaves out on every page so that a change at the top between pages neither
/// repeats nor skips a story. It is an opaque URL-safe text holding nothing but these.
/// </summary>
internal sealed record FrontPageCursor(DateTimeOffset At, Guid Id, int Shown, IReadOnlyList<Guid> Top)
{
    public string Write() =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes(string.Create(
                CultureInfo.InvariantCulture, $"{At.UtcTicks}|{Id:N}|{Shown}|{string.Join(',', Top.Select(id => id.ToString("N")))}")))
            .Replace("+", "-", StringComparison.Ordinal).Replace("/", "_", StringComparison.Ordinal).TrimEnd('=');

    public static bool TryParse(string cursor, out FrontPageCursor? value)
    {
        value = null;
        var padded = cursor.Replace("-", "+", StringComparison.Ordinal).Replace("_", "/", StringComparison.Ordinal);
        padded = padded.PadRight(padded.Length + ((4 - (padded.Length % 4)) % 4), '=');
        var bytes = new byte[padded.Length];
        if (!Convert.TryFromBase64String(padded, bytes, out var written))
        {
            return false;
        }

        var parts = Encoding.UTF8.GetString(bytes, 0, written).Split('|');
        if (parts.Length != 4
            || !long.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out var ticks)
            || ticks > DateTimeOffset.MaxValue.Ticks
            || !Guid.TryParseExact(parts[1], "N", out var id)
            || !int.TryParse(parts[2], NumberStyles.None, CultureInfo.InvariantCulture, out var shown)
            || shown is < 1 or >= ListFrontPageStoriesQuery.RiverMax)
        {
            return false;
        }

        var top = new List<Guid>();
        foreach (var part in parts[3].Split(',', StringSplitOptions.RemoveEmptyEntries))
        {
            if (top.Count > ListFrontPageStoriesQuery.HeadlineCount || !Guid.TryParseExact(part, "N", out var shownAtTop))
            {
                return false;
            }

            top.Add(shownAtTop);
        }

        value = new FrontPageCursor(new DateTimeOffset(ticks, TimeSpan.Zero), id, shown, top);
        return true;
    }
}

/// <summary>
/// Reads only what a reader may see: Published stories and Scheduled ones whose time has come, at
/// that time (ADR 0069), newest first, then by id. The story placed Lead leads, or else the newest;
/// stories placed Top are the headlines, newest first, and where fewer than four are placed the
/// newest other stories fill the rest; everything else is the river (L2-001 AC2, L2-069 AC6; ADR
/// 0105). One section answers only its own stories as the river, with no lead and no headlines
/// (L2-001 AC3). A page after a cursor answers the river alone. No story is answered twice.
/// </summary>
internal sealed class ListFrontPageStoriesHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<ListFrontPageStoriesQuery, FrontPageDto>
{
    public async Task<FrontPageDto> Handle(ListFrontPageStoriesQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var now = time.GetUtcNow();
        var visible = db.Stories.AsNoTracking()
            .Where(s => s.Section != null && (s.Status == StoryStatus.Published || (s.Status == StoryStatus.Scheduled && s.PublishAt <= now)));
        var river = StorySections.SectionOf(request.Section) is { } section ? visible.Where(s => s.Section == section) : visible;

        StorySummaryDto? lead = null;
        IReadOnlyList<StorySummaryDto> headlines = [];
        // A list, which the database takes as an array parameter.
        List<Guid> top = [];
        var shown = 0;
        if (request.Cursor is not null && FrontPageCursor.TryParse(request.Cursor, out var after) && after is not null)
        {
            var (at, id) = (after.At, after.Id);
            river = river.Where(s =>
                (s.Status == StoryStatus.Scheduled ? s.PublishAt : s.PublishedAt) < at
                || ((s.Status == StoryStatus.Scheduled ? s.PublishAt : s.PublishedAt) == at && s.Id.CompareTo(id) < 0));
            (top, shown) = ([.. after.Top], after.Shown);
        }
        else if (request.Section is null)
        {
            (lead, headlines) = await TopAsync(visible, cancellationToken).ConfigureAwait(false);
            top = lead is null ? [] : [lead.Id, .. headlines.Select(s => s.Id)];
        }

        if (top.Count > 0)
        {
            river = river.Where(s => !top.Contains(s.Id));
        }

        var size = Math.Min(ListFrontPageStoriesQuery.PageSize, ListFrontPageStoriesQuery.RiverMax - shown);
        var found = await ReadAsync(river, size + 1, cancellationToken).ConfigureAwait(false);
        var latest = found.Take(size).ToList();
        var next = found.Count > size && shown + size < ListFrontPageStoriesQuery.RiverMax
            ? new FrontPageCursor(latest[^1].PublishedAt, latest[^1].Id, shown + size, top).Write()
            : null;

        // No read is counted before the story page exists (journey 24), so none is most read yet;
        // the first page of Latest is where the five most read of the last 7 days go (ADR 0105).
        IReadOnlyList<StorySummaryDto> mostRead = [];
        return new FrontPageDto(lead, headlines, latest, next, mostRead);
    }

    /// <summary>
    /// The lead and the headlines (ADR 0105): the newest story placed Lead, or else the newest of
    /// all; then the stories placed Top, and the newest others where fewer than four are placed,
    /// shown newest first.
    /// </summary>
    private async Task<(StorySummaryDto? Lead, IReadOnlyList<StorySummaryDto> Headlines)> TopAsync(IQueryable<Story> visible, CancellationToken cancellationToken)
    {
        var lead = await NewestAsync(visible.Where(s => s.Placement == StoryPlacement.Lead), cancellationToken).ConfigureAwait(false)
            ?? await NewestAsync(visible, cancellationToken).ConfigureAwait(false);
        if (lead is null)
        {
            return (null, []);
        }

        var leadId = lead.Id;
        var placed = await ReadAsync(
            visible.Where(s => s.Placement == StoryPlacement.Top && s.Id != leadId), ListFrontPageStoriesQuery.HeadlineCount, cancellationToken).ConfigureAwait(false);
        var taken = placed.Select(s => s.Id).Append(leadId).ToList();
        IReadOnlyList<StorySummaryDto> others = placed.Count < ListFrontPageStoriesQuery.HeadlineCount
            ? await ReadAsync(visible.Where(s => !taken.Contains(s.Id)), ListFrontPageStoriesQuery.HeadlineCount - placed.Count, cancellationToken).ConfigureAwait(false)
            : [];
        return (lead, [.. placed.Concat(others).OrderByDescending(s => s.PublishedAt).ThenByDescending(s => s.Id)]);
    }

    private async Task<StorySummaryDto?> NewestAsync(IQueryable<Story> stories, CancellationToken cancellationToken)
    {
        var newest = await ReadAsync(stories, 1, cancellationToken).ConfigureAwait(false);
        return newest.Count == 0 ? null : newest[0];
    }

    /// <summary>The newest <paramref name="take"/> of <paramref name="stories"/>, each at the time readers see (ADR 0069).</summary>
    private async Task<IReadOnlyList<StorySummaryDto>> ReadAsync(IQueryable<Story> stories, int take, CancellationToken cancellationToken)
    {
        var bylines = db.Bylines.AsNoTracking();
        var rows = await stories
            .OrderByDescending(s => s.Status == StoryStatus.Scheduled ? s.PublishAt : s.PublishedAt)
            .ThenByDescending(s => s.Id)
            .Take(take)
            .Select(s => new
            {
                s.Id,
                s.Slug,
                s.Section,
                s.Headline,
                s.Summary,
                Byline = bylines.Where(b => b.Id == s.BylineId).Select(b => b.Name).FirstOrDefault(),
                At = s.Status == StoryStatus.Scheduled ? s.PublishAt : s.PublishedAt,
                s.ImageKey,
            })
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        return [.. rows.Select(s => new StorySummaryDto(
            s.Id,
            s.Slug ?? string.Empty,
            StorySections.SlugOf(s.Section!.Value),
            s.Headline,
            string.IsNullOrWhiteSpace(s.Summary) ? null : s.Summary,
            s.Byline ?? string.Empty,
            s.At!.Value,
            s.ImageKey))];
    }
}
