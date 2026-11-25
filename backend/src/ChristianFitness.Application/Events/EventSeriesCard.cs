using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Series;
using ChristianFitness.Domain.Events;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>One of the next dates on a session's series card: its start, topic and whether it was cancelled.</summary>
public sealed record EventSeriesDateDto(Guid Id, DateTimeOffset StartsAt, string? Topic, bool Cancelled);

/// <summary>
/// A session's series as its event page's card shows it (L2-010 AC5; ADR 0080, ADR 0096): this
/// session's number of the total (cancelled dates included), the cadence as numbers, the title,
/// whether the signed-in member joined the series, and up to <see cref="EventSeriesCards.Next"/>
/// dates after this one in date order, a cancelled one included and counted.
/// </summary>
public sealed record EventSeriesCardDto(
    Guid Id,
    string Title,
    int Number,
    int Total,
    SeriesCadenceDto Cadence,
    bool Joined,
    IReadOnlyList<EventSeriesDateDto> Next);

/// <summary>Reads the series card of an event; none for an event outside a series (L2-010 AC6).</summary>
internal static class EventSeriesCards
{
    /// <summary>How many later dates the card shows.</summary>
    public const int Next = 3;

    public static async Task<EventSeriesCardDto?> OfAsync(IAppDbContext db, Event e, Guid memberId, CancellationToken cancellationToken)
    {
        if (e.SeriesId is not { } seriesId)
        {
            return null;
        }

        var title = await db.EventSeries.AsNoTracking()
            .Where(s => s.Id == seriesId)
            .Select(s => s.Title)
            .SingleAsync(cancellationToken)
            .ConfigureAwait(false);
        var all = (await SeriesReads.SessionsOfAsync(db, [seriesId], cancellationToken).ConfigureAwait(false))[seriesId].ToList();
        var joined = await db.SeriesEnrolments.AsNoTracking()
            .AnyAsync(x => x.SeriesId == seriesId && x.MemberId == memberId, cancellationToken)
            .ConfigureAwait(false);
        var index = all.FindIndex(s => s.Id == e.Id);
        return new EventSeriesCardDto(
            seriesId,
            title,
            index + 1,
            all.Count,
            SeriesCadenceDto.Of(SeriesSchedule.CadenceOf(all.Select(s => s.Times))),
            joined,
            [.. all.Skip(index + 1).Take(Next).Select(s => new EventSeriesDateDto(s.Id, s.StartsAt, s.Topic, s.Cancelled))]);
    }
}
