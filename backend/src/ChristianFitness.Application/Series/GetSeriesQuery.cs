using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Events;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Series;

/// <summary>
/// One series as the member's page shows it (L2-051 AC1; ADR 0094): what it is, who hosts it (as
/// the event page's "Hosted by" card has it), its cadence as numbers, the next held session's start
/// (else the last held one's), its first and last held dates, where it meets, and whether the
/// signed-in member joined it. The app words every number.
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
    bool Joined);

/// <summary>
/// Opens one series for the signed-in member (L2-051; ADR 0094). A series opens while one of its
/// sessions is published and not cancelled, whatever its date; anything else is 404
/// <c>series_not_found</c> (L2-051 AC6).
/// </summary>
public sealed record GetSeriesQuery(Guid Id) : IRequest<SeriesDetailDto>;

internal sealed class GetSeriesHandler(IAppDbContext db, ICurrentMember current, TimeProvider time) : IRequestHandler<GetSeriesQuery, SeriesDetailDto>
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
            joined);
    }
}
