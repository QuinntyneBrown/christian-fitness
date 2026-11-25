using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Events;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Series;

/// <summary>
/// One series as the member's page shows it (L2-051 AC1; ADR 0096): what it is, who hosts it (as
/// the event page's "Hosted by" card has it), its cadence as numbers, the next held session's start
/// (else the last held one's), its first and last held dates, where it meets, its prices in cents
/// (no drop-in price when members cannot drop in), its capacity, the spots left (none when no
/// session is to come; <see cref="SeriesPlaces"/>), how many sessions are to come, whether the
/// signed-in member joined it, and every date in date order. The app words every number.
/// </summary>
public sealed record SeriesDetailDto(
    Guid Id,
    string Title,
    string Category,
    string Summary,
    string? ImageKey,
    EventHostCardDto Host,
    SeriesCadenceDto Cadence,
    DateTimeOffset StartsAt,
    DateTimeOffset FirstStartsAt,
    DateTimeOffset LastStartsAt,
    string Place,
    string Area,
    int PriceCents,
    int? DropInPriceCents,
    int Capacity,
    int? SpotsLeft,
    int SessionsLeft,
    bool Joined,
    IReadOnlyList<SeriesSessionDto> Sessions);

/// <summary>
/// One date of a series as its row shows it (L2-051 AC2 to AC5; ADR 0096): its position among all
/// the dates (cancelled ones included; ADR 0080), its start, topic and ADR 0091's state by the
/// API's clock, and whether the signed-in member holds a place at it.
/// </summary>
public sealed record SeriesSessionDto(Guid Id, int Number, DateTimeOffset StartsAt, string? Topic, string State, bool Held);

/// <summary>
/// Opens one series for the signed-in member (L2-051; ADR 0096). A series opens while one of its
/// sessions is published and not cancelled, whatever its date; anything else is 404
/// <c>series_not_found</c> (L2-051 AC6).
/// </summary>
public sealed record GetSeriesQuery(Guid Id) : IRequest<SeriesDetailDto>;

internal sealed class GetSeriesHandler(IAppDbContext db, IRegistrationReader registrations, ICurrentMember current, TimeProvider time)
    : IRequestHandler<GetSeriesQuery, SeriesDetailDto>
{
    public async Task<SeriesDetailDto> Handle(GetSeriesQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var series = await db.EventSeries.AsNoTracking()
            .SingleOrDefaultAsync(s => s.Id == request.Id, cancellationToken)
            .ConfigureAwait(false);
        var sessions = series is null
            ? []
            : (await SeriesReads.SessionsOfAsync(db, [series.Id], cancellationToken).ConfigureAwait(false))[series.Id].ToList();
        if (series is null || sessions.All(s => s.Cancelled))
        {
            throw new RefusalException(RefusalCodes.SeriesNotFound, RefusalKind.NotFound);
        }

        var now = time.GetUtcNow();
        var facts = SeriesFacts.Of([.. sessions.Select(s => s.Times)], now);
        // The foreign key guarantees the host; it is shown whatever the listing's status (ADR 0089).
        var host = await db.DirectoryListings.AsNoTracking()
            .SingleAsync(l => l.Id == series.HostListingId, cancellationToken)
            .ConfigureAwait(false);
        var memberId = current.Id;
        var joined = await db.SeriesEnrolments.AsNoTracking()
            .AnyAsync(e => e.SeriesId == series.Id && e.MemberId == memberId, cancellationToken)
            .ConfigureAwait(false);
        var sessionIds = sessions.Select(s => s.Id).ToList();
        var held = await db.Registrations.AsNoTracking()
            .Where(r => r.MemberId == memberId && sessionIds.Contains(r.EventId))
            .Select(r => r.EventId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var states = SeriesSchedule.StatesOf([.. sessions.Select(s => s.Times)], now);
        var going = await registrations.GoingForAsync(sessionIds, cancellationToken).ConfigureAwait(false);
        var spotsLeft = SeriesPlaces.SpotsLeft(series.Capacity, sessions.Select(s => (s.Times, going.GetValueOrDefault(s.Id))), now);

        // A series that opens has a held date, so it has a time, a first and a last held date.
        return new SeriesDetailDto(
            series.Id,
            series.Title,
            EventNames.Of(series.Category),
            series.Summary,
            series.ImageKey,
            EventHostCardDto.Of(host),
            SeriesCadenceDto.Of(facts.Cadence),
            facts.StartsAt!.Value,
            facts.First!.Value,
            facts.Last!.Value,
            series.Place,
            series.Area,
            series.PriceCents,
            series.DropInPriceCents,
            series.Capacity,
            spotsLeft,
            facts.Left,
            joined,
            [.. sessions.Select((s, n) => new SeriesSessionDto(s.Id, n + 1, s.StartsAt, s.Topic, SessionStateNames.Of(states[n]), held.Contains(s.Id)))]);
    }
}
