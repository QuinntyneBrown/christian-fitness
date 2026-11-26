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
/// the dates (cancelled ones included; ADR 0080), its start, its end (none when unknown; ADR 0101), topic and ADR 0091's state by the
/// API's clock, whether the signed-in member holds a place at it (never at a cancelled date; ADR
/// 0103), and whether it is full: still to come, not cancelled and every place taken (L2-053 AC7;
/// ADR 0102).
/// </summary>
public sealed record SeriesSessionDto(Guid Id, int Number, DateTimeOffset StartsAt, DateTimeOffset? EndsAt, string? Topic, string State, bool Held, bool Full);

/// <summary>
/// Opens one series for the signed-in member (L2-051; ADR 0096). A series opens while one of its
/// sessions is published and not cancelled, whatever its date; anything else is 404
/// <c>series_not_found</c> (L2-051 AC6).
/// </summary>
public sealed record GetSeriesQuery(Guid Id) : IRequest<SeriesDetailDto>;

internal sealed class GetSeriesHandler(IAppDbContext db, IRegistrationReader registrations, ICurrentMember current, TimeProvider time)
    : IRequestHandler<GetSeriesQuery, SeriesDetailDto>
{
    public Task<SeriesDetailDto> Handle(GetSeriesQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        return SeriesDetails.OfAsync(db, registrations, request.Id, current.Id, time.GetUtcNow(), cancellationToken);
    }
}

/// <summary>One series as a member's page shows it, shared by the read, the join and the leave (ADR 0096, ADR 0101).</summary>
internal static class SeriesDetails
{
    /// <summary>
    /// The series as <paramref name="memberId"/> sees it at <paramref name="now"/>; 404
    /// <c>series_not_found</c> when it is unknown or none of its dates is held (L2-051 AC6).
    /// </summary>
    public static async Task<SeriesDetailDto> OfAsync(
        IAppDbContext db,
        IRegistrationReader registrations,
        Guid seriesId,
        Guid memberId,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var series = await db.EventSeries.AsNoTracking()
            .SingleOrDefaultAsync(s => s.Id == seriesId, cancellationToken)
            .ConfigureAwait(false);
        var sessions = series is null
            ? []
            : (await SeriesReads.SessionsOfAsync(db, [series.Id], cancellationToken).ConfigureAwait(false))[series.Id].ToList();
        if (series is null || sessions.All(s => s.Cancelled))
        {
            throw new RefusalException(RefusalCodes.SeriesNotFound, RefusalKind.NotFound);
        }

        var facts = SeriesFacts.Of([.. sessions.Select(s => s.Times)], now);
        // The foreign key guarantees the host; it is shown whatever the listing's status (ADR 0089).
        var host = await db.DirectoryListings.AsNoTracking()
            .SingleAsync(l => l.Id == series.HostListingId, cancellationToken)
            .ConfigureAwait(false);
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
            [.. sessions.Select((s, n) => new SeriesSessionDto(
                s.Id,
                n + 1,
                s.StartsAt,
                s.EndsAt,
                s.Topic,
                SessionStateNames.Of(states[n]),
                held.Contains(s.Id) && !s.Cancelled,
                !s.Cancelled && s.StartsAt > now && going.GetValueOrDefault(s.Id) >= series.Capacity))]);
    }
}
