using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Events;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Series;

/// <summary>
/// The member's Series view (L2-050 AC1, AC5; ADR 0093): the listed series by their next session's
/// start, then id, at most <see cref="Limit"/> with no paging.
/// </summary>
public sealed class ListSeriesQuery : IRequest<SeriesListDto>
{
    /// <summary>The most series one answer holds (L2-050 AC5).</summary>
    public const int Limit = 100;
}

/// <summary>
/// One series as the member's row shows it (L2-050 AC1): what it is and who hosts it, its cadence
/// as numbers, the next session's start, its first and last held dates, one state a session in
/// date order (ADR 0091), its price in cents and whether the signed-in member joined it. The app
/// words every number and state.
/// </summary>
public sealed record SeriesRowDto(
    Guid Id,
    string Title,
    string Category,
    string? ImageKey,
    EventHostDto Host,
    string Area,
    SeriesCadenceDto Cadence,
    DateTimeOffset StartsAt,
    DateTimeOffset FirstStartsAt,
    DateTimeOffset LastStartsAt,
    IReadOnlyList<string> Sessions,
    int PriceCents,
    bool Joined);

/// <summary>The Series view's list: at most <see cref="ListSeriesQuery.Limit"/> rows, soonest first.</summary>
public sealed record SeriesListDto(IReadOnlyList<SeriesRowDto> Series);

/// <summary>How many series the member's Series view lists with no filter (L2-050 AC6; ADR 0093).</summary>
public sealed record CountSeriesQuery : IRequest<SeriesCountDto>;

/// <summary>"Series (<see cref="Count"/>)" on the view switch.</summary>
public sealed record SeriesCountDto(int Count);

/// <summary>
/// The series a member may browse (L2-050 AC5; ADR 0093): those with a session that is published
/// (so not cancelled) and has not started. A series has no status of its own; one with no such
/// session is not listed.
/// </summary>
internal static class ListedSeries
{
    /// <summary>The ids of the series listed at <paramref name="now"/>.</summary>
    public static IQueryable<Guid> IdsAt(IAppDbContext db, DateTimeOffset now) =>
        db.Events.AsNoTracking()
            .Where(e => e.SeriesId != null && e.Status == EventStatus.Published && e.StartsAt > now)
            .Select(e => e.SeriesId!.Value)
            .Distinct();
}

internal sealed class CountSeriesHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<CountSeriesQuery, SeriesCountDto>
{
    public async Task<SeriesCountDto> Handle(CountSeriesQuery request, CancellationToken cancellationToken)
    {
        var ids = ListedSeries.IdsAt(db, time.GetUtcNow());
        var count = await db.EventSeries.AsNoTracking().CountAsync(s => ids.Contains(s.Id), cancellationToken).ConfigureAwait(false);
        return new SeriesCountDto(count);
    }
}

/// <summary>
/// Reads the listed series, their sessions, hosts and the caller's enrolments, and orders them in
/// memory: the community runs a handful of series (ADR 0091).
/// </summary>
internal sealed class ListSeriesHandler(IAppDbContext db, ICurrentMember current, TimeProvider time) : IRequestHandler<ListSeriesQuery, SeriesListDto>
{
    public async Task<SeriesListDto> Handle(ListSeriesQuery request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var ids = ListedSeries.IdsAt(db, now);
        var listed = await db.EventSeries.AsNoTracking().Where(s => ids.Contains(s.Id)).ToListAsync(cancellationToken).ConfigureAwait(false);
        var seriesIds = listed.Select(s => s.Id).ToList();
        var sessions = await SeriesReads.SessionsOfAsync(db, seriesIds, cancellationToken).ConfigureAwait(false);

        var rows = listed
            .Select(series => (Series: series, Sessions: sessions[series.Id].ToList()))
            .Select(row => (row.Series, row.Sessions, Next: row.Sessions.First(s => !s.Cancelled && s.StartsAt > now).StartsAt))
            .OrderBy(row => row.Next)
            .ThenBy(row => row.Series.Id)
            .Take(ListSeriesQuery.Limit)
            .ToList();

        var hostIds = rows.Select(row => row.Series.HostListingId).Distinct().ToList();
        var hosts = await db.DirectoryListings.AsNoTracking()
            .Where(l => hostIds.Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, cancellationToken)
            .ConfigureAwait(false);
        var memberId = current.Id;
        var joined = await db.SeriesEnrolments.AsNoTracking()
            .Where(e => e.MemberId == memberId && seriesIds.Contains(e.SeriesId))
            .Select(e => e.SeriesId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return new SeriesListDto([.. rows.Select(row =>
        {
            var times = row.Sessions.Select(s => s.Times).ToList();
            var facts = SeriesFacts.Of(times, now);
            // A listed series has a held session to come, so it has a first and a last held date.
            return new SeriesRowDto(
                row.Series.Id,
                row.Series.Title,
                EventNames.Of(row.Series.Category),
                row.Series.ImageKey,
                EventHostDto.Of(hosts[row.Series.HostListingId]),
                row.Series.Area,
                SeriesCadenceDto.Of(facts.Cadence),
                row.Next,
                facts.First!.Value,
                facts.Last!.Value,
                [.. SeriesSchedule.StatesOf(times, now).Select(SessionStateNames.Of)],
                row.Series.PriceCents,
                joined.Contains(row.Series.Id));
        })]);
    }
}
