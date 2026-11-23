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
/// <paramref name="Cursor"/>, of one category when <paramref name="Category"/> names it (L2-009 AC1, AC2,
/// AC4, AC5; ADR 0027, ADR 0028).
/// </summary>
public sealed record ListEventsQuery(string? Cursor, string? Category = null) : IRequest<EventPageDto>
{
    public const int PageSize = 20;
}

/// <summary>A cursor this API did not hand out is refused with <c>cursor_invalid</c> on the <c>cursor</c> field.</summary>
internal sealed class ListEventsValidator : AbstractValidator<ListEventsQuery>
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
internal sealed class ListEventsHandler(IAppDbContext db, IRegistrationReader registrations, TimeProvider time)
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
