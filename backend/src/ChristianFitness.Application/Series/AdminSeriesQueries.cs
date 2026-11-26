using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Events;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Series;

/// <summary>Event series (L2-071 AC1; ADR 0091): every series, by its next session, at most <see cref="Limit"/>.</summary>
public sealed record ListAdminSeriesQuery : IRequest<AdminSeriesListDto>
{
    /// <summary>The most series one answer holds; paging waits until the community runs more (ADR 0091).</summary>
    public const int Limit = 100;
}

/// <summary>One series and its sessions (L2-071 AC2, AC3); an unknown id is 404 <c>not_found</c>.</summary>
public sealed record GetAdminSeriesQuery(Guid Id) : IRequest<AdminSeriesDto>;

/// <summary>Reads what both answers need: each series' sessions in date order and how many joined.</summary>
internal static class SeriesReads
{
    /// <summary>The sessions of <paramref name="seriesIds"/>, each list in date order (ties by id).</summary>
    public static async Task<ILookup<Guid, SessionRow>> SessionsOfAsync(IAppDbContext db, IReadOnlyCollection<Guid>? seriesIds, CancellationToken cancellationToken)
    {
        var events = db.Events.AsNoTracking().Where(e => e.SeriesId != null);
        if (seriesIds is not null)
        {
            events = events.Where(e => seriesIds.Contains(e.SeriesId!.Value));
        }

        var rows = await events
            .OrderBy(e => e.StartsAt)
            .ThenBy(e => e.Id)
            .Select(e => new SessionRow(e.Id, e.SeriesId!.Value, e.StartsAt, e.EndsAt, e.Topic, e.Status == EventStatus.Cancelled))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return rows.ToLookup(r => r.SeriesId);
    }

    /// <summary>How many members joined each series that has any.</summary>
    public static async Task<Dictionary<Guid, int>> JoinedAsync(IAppDbContext db, IReadOnlyCollection<Guid>? seriesIds, CancellationToken cancellationToken)
    {
        var enrolments = db.SeriesEnrolments.AsNoTracking();
        if (seriesIds is not null)
        {
            enrolments = enrolments.Where(e => seriesIds.Contains(e.SeriesId));
        }

        return await enrolments
            .GroupBy(e => e.SeriesId)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToDictionaryAsync(g => g.Key, g => g.Count, cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// The members holding a place at each of <paramref name="sessionIds"/> of <paramref name="seriesId"/>,
    /// each marked whether they joined the series (else they dropped in; ADR 0103).
    /// </summary>
    public static async Task<ILookup<Guid, Holder>> HoldersAsync(IAppDbContext db, Guid seriesId, IReadOnlyCollection<Guid> sessionIds, CancellationToken cancellationToken)
    {
        var places = await db.Registrations.AsNoTracking()
            .Where(r => sessionIds.Contains(r.EventId))
            .Select(r => new { r.EventId, r.MemberId })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var memberIds = places.Select(p => p.MemberId).Distinct().ToList();
        var joined = (await db.SeriesEnrolments.AsNoTracking()
            .Where(e => e.SeriesId == seriesId && memberIds.Contains(e.MemberId))
            .Select(e => e.MemberId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false)).ToHashSet();
        return places.Distinct().ToLookup(p => p.EventId, p => new Holder(p.MemberId, joined.Contains(p.MemberId)));
    }
}

/// <summary>A member holding a place at a session, and whether they joined its series (else they dropped in).</summary>
internal sealed record Holder(Guid MemberId, bool Joined);

/// <summary>One session as the reads above take it.</summary>
internal sealed record SessionRow(Guid Id, Guid SeriesId, DateTimeOffset StartsAt, DateTimeOffset? EndsAt, string? Topic, bool Cancelled)
{
    public SessionTimes Times => new(StartsAt, EndsAt, Cancelled);
}

/// <summary>
/// Orders by the next held session's start, then the series with none left, then title and id
/// (ADR 0091). The community runs a handful of series, so they are ordered in memory.
/// </summary>
internal sealed class ListAdminSeriesHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<ListAdminSeriesQuery, AdminSeriesListDto>
{
    public async Task<AdminSeriesListDto> Handle(ListAdminSeriesQuery request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var all = await db.EventSeries.AsNoTracking().ToListAsync(cancellationToken).ConfigureAwait(false);
        var sessions = await SeriesReads.SessionsOfAsync(db, null, cancellationToken).ConfigureAwait(false);
        var joined = await SeriesReads.JoinedAsync(db, null, cancellationToken).ConfigureAwait(false);

        var rows = all
            .Select(series => (Series: series, Facts: SeriesFacts.Of([.. sessions[series.Id].Select(s => s.Times)], now)))
            .OrderBy(row => row.Facts.Next is null)
            .ThenBy(row => row.Facts.Next)
            .ThenBy(row => row.Series.Title, StringComparer.Ordinal)
            .ThenBy(row => row.Series.Id)
            .Take(ListAdminSeriesQuery.Limit)
            .Select(row => new AdminSeriesRowDto(
                row.Series.Id,
                row.Series.Title,
                SeriesCadenceDto.Of(row.Facts.Cadence),
                row.Facts.StartsAt,
                joined.GetValueOrDefault(row.Series.Id),
                row.Series.Capacity));
        return new AdminSeriesListDto([.. rows]);
    }
}

internal sealed class GetAdminSeriesHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<GetAdminSeriesQuery, AdminSeriesDto>
{
    public async Task<AdminSeriesDto> Handle(GetAdminSeriesQuery request, CancellationToken cancellationToken)
    {
        var series = await db.EventSeries.AsNoTracking().SingleOrDefaultAsync(s => s.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        return await AdminSeriesAnswer.OfAsync(db, series, time.GetUtcNow(), cancellationToken).ConfigureAwait(false);
    }
}

/// <summary>The page's answer for one series, which the create, save and Add a date answers reuse.</summary>
internal static class AdminSeriesAnswer
{
    public static async Task<AdminSeriesDto> OfAsync(IAppDbContext db, EventSeries series, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var ids = new[] { series.Id };
        var sessions = (await SeriesReads.SessionsOfAsync(db, ids, cancellationToken).ConfigureAwait(false))[series.Id].ToList();
        var joined = (await SeriesReads.JoinedAsync(db, ids, cancellationToken).ConfigureAwait(false)).GetValueOrDefault(series.Id);
        // The foreign key guarantees the host (ADR 0067).
        var host = await db.DirectoryListings.AsNoTracking()
            .SingleAsync(l => l.Id == series.HostListingId, cancellationToken)
            .ConfigureAwait(false);
        var times = sessions.Select(s => s.Times).ToList();
        var facts = SeriesFacts.Of(times, now);
        var states = SeriesSchedule.StatesOf(times, now);
        var holders = await SeriesReads.HoldersAsync(db, series.Id, [.. sessions.Select(s => s.Id)], cancellationToken).ConfigureAwait(false);

        return new AdminSeriesDto(
            series.Id,
            series.Title,
            EventNames.Of(series.Category),
            series.Summary,
            series.ImageKey,
            EventHostDto.Of(host),
            SeriesCadenceDto.Of(facts.Cadence),
            facts.StartsAt,
            facts.First,
            facts.Last,
            series.Place,
            series.Area,
            series.PriceCents,
            series.DropInPriceCents,
            series.Capacity,
            joined,
            facts.Left,
            facts.Held,
            [.. sessions.Select((s, n) => new AdminSessionDto(
                s.Id,
                n + 1,
                s.StartsAt,
                s.EndsAt,
                s.Topic,
                SessionStateNames.Of(states[n]),
                s.StartsAt <= now,
                holders[s.Id].Count(h => h.Joined),
                holders[s.Id].Count(h => !h.Joined)))]);
    }
}
