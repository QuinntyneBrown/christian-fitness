using System.Globalization;
using System.Text;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Events;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>An event as a member's list shows it (L2-009 AC1; ADR 0027); the app words the date and the price.</summary>
public sealed record EventSummaryDto(
    Guid Id,
    string Title,
    string Category,
    DateTimeOffset StartsAt,
    string Place,
    string Area,
    int PriceCents,
    int Capacity,
    int Going,
    string? ImageKey);

/// <summary>One page of the member list and the cursor of the next, or none when this is the last.</summary>
public sealed record EventPageDto(IReadOnlyList<EventSummaryDto> Events, string? NextCursor);

/// <summary>
/// The published events that have not started, soonest first, 20 to a page after the opaque
/// <see cref="Cursor"/>, of one category when <see cref="Category"/> names it, whose title contains
/// <see cref="Search"/> in any case, and only those the signed-in member holds a place at when
/// <see cref="Going"/> (L2-009 AC1, AC2, AC4, AC5; L2-075; L2-076; ADR 0027, ADR 0030, ADR 0081).
/// The member is the session's, never the request's. A class, not a record, so no generated
/// <c>ToString</c> can print what a member typed.
/// </summary>
public sealed class ListEventsQuery(string? cursor, string? category = null, string? search = null, string? going = null) : IRequest<EventPageDto>
{
    public const int PageSize = 20;

    public string? Cursor { get; } = cursor;

    public string? Category { get; } = category;

    /// <summary>What a title must contain, in any case, once trimmed; none or blank narrows nothing.</summary>
    public string? Search { get; } = search;

    /// <summary>Whether to keep only the events the signed-in member is registered for: only for exactly <c>true</c>.</summary>
    public bool Going { get; } = string.Equals(going, "true", StringComparison.Ordinal);
}

/// <summary>The search rule (L2-075 AC2, AC3; ADR 0081): trimmed, compared in lower case, blank is none.</summary>
public static class EventSearch
{
    /// <summary>The lower-case term a title must contain, or none for no text or blank text.</summary>
    public static string? TermOf(string? text) =>
        string.IsNullOrWhiteSpace(text) ? null : text.Trim().ToLowerInvariant();
}

/// <summary>A cursor or category this API does not know is refused with <c>cursor_invalid</c> or <c>category_invalid</c>.</summary>
public sealed class ListEventsValidator : AbstractValidator<ListEventsQuery>
{
    public ListEventsValidator()
    {
        RuleFor(q => q.Cursor)
            .Must(cursor => cursor is null || EventCursor.TryParse(cursor, out _))
            .WithMessage("The list could not continue")
            .WithErrorCode(EventFieldCodes.CursorInvalid);
        RuleFor(q => q.Category)
            .Must(category => category is null || EventNames.CategoryOf(category) is not null)
            .WithMessage("Choose one of the categories")
            .WithErrorCode(EventFieldCodes.CategoryInvalid);
    }
}

/// <summary>The start and id of the last event of a page, as an opaque URL-safe text.</summary>
internal static class EventCursor
{
    public static string Of(DateTimeOffset startsAt, Guid id) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes($"{startsAt.UtcTicks.ToString(CultureInfo.InvariantCulture)}|{id:N}"))
            .Replace("+", "-", StringComparison.Ordinal).Replace("/", "_", StringComparison.Ordinal).TrimEnd('=');

    public static bool TryParse(string cursor, out (DateTimeOffset StartsAt, Guid Id) value)
    {
        value = default;
        var padded = cursor.Replace("-", "+", StringComparison.Ordinal).Replace("_", "/", StringComparison.Ordinal);
        padded = padded.PadRight(padded.Length + ((4 - (padded.Length % 4)) % 4), '=');
        var bytes = new byte[padded.Length];
        if (!Convert.TryFromBase64String(padded, bytes, out var written))
        {
            return false;
        }

        var parts = Encoding.UTF8.GetString(bytes, 0, written).Split('|');
        if (parts.Length != 2
            || !long.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out var ticks)
            || ticks > DateTimeOffset.MaxValue.Ticks
            || !Guid.TryParseExact(parts[1], "N", out var id))
        {
            return false;
        }

        value = (new DateTimeOffset(ticks, TimeSpan.Zero), id);
        return true;
    }
}

/// <summary>
/// Reads one page: asks for 21 so it knows whether more remain, then counts who is going for the
/// page's events in one question.
/// </summary>
internal sealed class ListEventsHandler(IAppDbContext db, IRegistrationReader registrations, ICurrentMember current, TimeProvider time)
    : IRequestHandler<ListEventsQuery, EventPageDto>
{
    public async Task<EventPageDto> Handle(ListEventsQuery request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var events = db.Events.AsNoTracking().Where(e => e.Status == EventStatus.Published && e.StartsAt > now);
        if (EventNames.CategoryOf(request.Category) is { } category)
        {
            events = events.Where(e => e.Category == category);
        }

        if (EventSearch.TermOf(request.Search) is { } term)
        {
#pragma warning disable CA1304, CA1311, CA1862 // Translated by EF Core to the database's lower(); no culture is involved.
            events = events.Where(e => e.Title.ToLower().Contains(term));
#pragma warning restore CA1304, CA1311, CA1862
        }

        if (request.Going)
        {
            var memberId = current.Id;
            var mine = db.Registrations.Where(r => r.MemberId == memberId).Select(r => r.EventId);
            events = events.Where(e => mine.Contains(e.Id));
        }

        if (request.Cursor is not null && EventCursor.TryParse(request.Cursor, out var after))
        {
            events = events.Where(e => e.StartsAt > after.StartsAt || (e.StartsAt == after.StartsAt && e.Id.CompareTo(after.Id) > 0));
        }

        var found = await events
            .OrderBy(e => e.StartsAt)
            .ThenBy(e => e.Id)
            .Take(ListEventsQuery.PageSize + 1)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var page = found.Take(ListEventsQuery.PageSize).ToList();
        var going = await registrations.GoingForAsync([.. page.Select(e => e.Id)], cancellationToken).ConfigureAwait(false);

        var summaries = page
            .Select(e => new EventSummaryDto(
                e.Id, e.Title, EventNames.Of(e.Category), e.StartsAt, e.Place, e.Area, e.PriceCents, e.Capacity,
                going.GetValueOrDefault(e.Id), e.ImageKey))
            .ToList();
        var next = found.Count > ListEventsQuery.PageSize ? EventCursor.Of(page[^1].StartsAt, page[^1].Id) : null;
        return new EventPageDto(summaries, next);
    }
}
