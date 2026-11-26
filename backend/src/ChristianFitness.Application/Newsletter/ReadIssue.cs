using System.Text.Json;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.News;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Newsletter;
using ChristianFitness.Domain.News;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Newsletter;

/// <summary>
/// An issue as the web shows it (L2-059 AC1): its number and date, the newsletter's name, the
/// editor's note, the big story, up to three more stories, the calendar's four events and the verse.
/// It names no reader: the greeting is the page's own (L2-059 AC2).
/// </summary>
public sealed record IssueDto(
    int Number,
    DateTimeOffset Date,
    string Name,
    string EditorsNote,
    IssueStoryDto? Lead,
    IReadOnlyList<IssueStoryDto> Briefs,
    IReadOnlyList<IssueEventDto> Events,
    string Verse,
    string VerseReference);

public sealed record IssueStoryDto(string Slug, string? Section, string Headline, string Summary, string? Author, StoryImageDto? Image);

public sealed record IssueEventDto(Guid Id, string Title, DateTimeOffset StartsAt, string Area, int PriceCents);

/// <summary>
/// The latest sent issue, or the sent issue with <paramref name="Number"/> (L2-059 AC1, AC4, AC7):
/// nothing sent, an unknown number or an issue not yet sent is 404 <c>not_found</c>.
/// </summary>
public sealed record GetIssueQuery(int? Number) : IRequest<IssueDto>;

/// <summary>The Admin's preview (L2-070 AC9): the issue as saved, read now, in the web version's shape.</summary>
public sealed record PreviewIssueQuery(int Number) : IRequest<IssueDto>;

/// <summary>
/// What an issue said when sending started, kept with it (L2-059 AC1): later edits to a story or an
/// event do not change a sent issue. Each story keeps its id only so a story unpublished since can
/// be hidden (L2-059 AC7).
/// </summary>
internal sealed record IssueCapture(
    string EditorsNote,
    CapturedStory? Lead,
    IReadOnlyList<CapturedStory> Briefs,
    IReadOnlyList<IssueEventDto> Events,
    string Verse,
    string VerseReference)
{
    /// <summary>The calendar holds the next four published events (L2-059 AC1).</summary>
    public const int CalendarEvents = 4;

    public string ToJson() => JsonSerializer.Serialize(this);

    public static IssueCapture FromJson(string json) =>
        JsonSerializer.Deserialize<IssueCapture>(json) ?? throw new InvalidOperationException("The issue's captured content is empty.");

    /// <summary>Reads the issue's stories and the calendar as they are at <paramref name="now"/>.</summary>
    public static async Task<IssueCapture> ReadAsync(IAppDbContext db, NewsletterIssue issue, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var storyIds = issue.AlsoStoryIds.Append(issue.LeadStoryId ?? Guid.Empty).ToList();
        var stories = await db.Stories.AsNoTracking()
            .Where(s => storyIds.Contains(s.Id) && s.Status == StoryStatus.Published)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        var bylineIds = stories.Where(s => s.BylineId != null).Select(s => s.BylineId!.Value).ToList();
        var bylines = await db.Bylines.AsNoTracking().Where(b => bylineIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, b => b.Name, cancellationToken).ConfigureAwait(false);
        var captured = stories.ToDictionary(s => s.Id, s => new CapturedStory(
            s.Id,
            new IssueStoryDto(
                s.Slug ?? s.Id.ToString("D"),
                StoryNames.Of(s.Section),
                s.Headline,
                s.Summary,
                s.BylineId is { } b ? bylines.GetValueOrDefault(b) : null,
                s.ImageKey is { } key && s.ImageCrop is { } crop ? new StoryImageDto(key, new StoryCropDto(crop.X, crop.Y, crop.Width, crop.Height)) : null)));
        var events = await db.Events.AsNoTracking()
            .Where(e => e.Status == EventStatus.Published && e.StartsAt > now)
            .OrderBy(e => e.StartsAt).ThenBy(e => e.Id)
            .Take(CalendarEvents)
            .Select(e => new IssueEventDto(e.Id, e.Title, e.StartsAt, e.Area, e.PriceCents))
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        return new IssueCapture(
            issue.EditorsNote,
            issue.LeadStoryId is { } lead ? captured.GetValueOrDefault(lead) : null,
            [.. issue.AlsoStoryIds.Where(captured.ContainsKey).Select(id => captured[id])],
            events,
            issue.Verse,
            issue.VerseReference);
    }

    /// <summary>The web version, with only the stories in <paramref name="published"/>.</summary>
    public IssueDto ToDto(NewsletterIssue issue, IReadOnlySet<Guid> published) => new(
        issue.Number,
        issue.SendAt,
        NewsletterEmails.NewsletterName,
        EditorsNote,
        Lead is { } lead && published.Contains(lead.Id) ? lead.Story : null,
        [.. Briefs.Where(b => published.Contains(b.Id)).Select(b => b.Story)],
        Events,
        Verse,
        VerseReference);

    public IEnumerable<Guid> StoryIds => Briefs.Select(b => b.Id).Concat(Lead is { } lead ? [lead.Id] : []);
}

internal sealed record CapturedStory(Guid Id, IssueStoryDto Story);

internal sealed class GetIssueHandler(IAppDbContext db) : IRequestHandler<GetIssueQuery, IssueDto>
{
    public async Task<IssueDto> Handle(GetIssueQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var sent = db.NewsletterIssues.AsNoTracking().Where(i => i.Status == IssueStatus.Sent);
        var issue = (request.Number is { } number
                ? await sent.SingleOrDefaultAsync(i => i.Number == number, cancellationToken).ConfigureAwait(false)
                : await sent.OrderByDescending(i => i.SentAt).ThenByDescending(i => i.Number).FirstOrDefaultAsync(cancellationToken).ConfigureAwait(false))
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        if (issue.Captured is not { } json)
        {
            throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        }

        var capture = IssueCapture.FromJson(json);
        var ids = capture.StoryIds.ToList();
        var published = await db.Stories.AsNoTracking()
            .Where(s => ids.Contains(s.Id) && s.Status == StoryStatus.Published)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        return capture.ToDto(issue, published.ToHashSet());
    }
}

internal sealed class PreviewIssueHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<PreviewIssueQuery, IssueDto>
{
    public async Task<IssueDto> Handle(PreviewIssueQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var issue = await Issues.FindAsync(db, request.Number, cancellationToken).ConfigureAwait(false);
        var capture = issue.Captured is { } json
            ? IssueCapture.FromJson(json)
            : await IssueCapture.ReadAsync(db, issue, time.GetUtcNow(), cancellationToken).ConfigureAwait(false);
        return capture.ToDto(issue, capture.StoryIds.ToHashSet());
    }
}
