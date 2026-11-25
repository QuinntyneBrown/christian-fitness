using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Series;

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
