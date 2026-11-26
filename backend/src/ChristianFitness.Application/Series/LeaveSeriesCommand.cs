using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Series;

/// <summary>
/// The signed-in member leaves a series and the answer is the series as they now see it (L2-052
/// AC9; ADR 0099). In one unit of work the enrolment and every place at a session of the series
/// that has not started (cancelled ones included) are removed; each touched session releases a
/// place and the series withdraws one. Places at started sessions stay in the member's history,
/// and the member leaves the series chat when nothing else keeps them in it. A member who has not
/// joined gets the series unchanged; a series that does not open is <c>series_not_found</c>.
/// </summary>
public sealed record LeaveSeriesCommand(Guid SeriesId) : IRequest<SeriesDetailDto>;

internal sealed class LeaveSeriesHandler(IAppDbContext db, IRegistrationReader registrations, ICurrentMember current, TimeProvider time)
    : IRequestHandler<LeaveSeriesCommand, SeriesDetailDto>
{
    /// <summary>How many times a leave that lost a race reads the series again before it gives up.</summary>
    public const int Attempts = 3;

    public async Task<SeriesDetailDto> Handle(LeaveSeriesCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var memberId = current.Id;
        for (var attempt = 1; ; attempt++)
        {
            var touched = await TryLeaveAsync(request.SeriesId, memberId, cancellationToken).ConfigureAwait(false);
            try
            {
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
                return await SeriesDetails.OfAsync(db, registrations, request.SeriesId, memberId, time.GetUtcNow(), cancellationToken).ConfigureAwait(false);
            }
            catch (DbUpdateConcurrencyException) when (attempt < Attempts)
            {
                // A join, drop-in or cancellation committed between this read and write (ADR 0033,
                // ADR 0099): put back what this attempt removed, read again and decide again.
                await ForgetAsync(touched, cancellationToken).ConfigureAwait(false);
            }
        }
    }

    /// <summary>
    /// Removes the enrolment and the places to come for one attempt and answers the rows it changed;
    /// a member who has not joined touches nothing.
    /// </summary>
    private async Task<Attempt?> TryLeaveAsync(Guid seriesId, Guid memberId, CancellationToken cancellationToken)
    {
        var series = await db.EventSeries.SingleOrDefaultAsync(s => s.Id == seriesId, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.SeriesNotFound, RefusalKind.NotFound);
        var enrolment = await db.SeriesEnrolments
            .SingleOrDefaultAsync(e => e.SeriesId == seriesId && e.MemberId == memberId, cancellationToken)
            .ConfigureAwait(false);
        if (enrolment is null)
        {
            return null;
        }

        var now = time.GetUtcNow();
        var toCome = await db.Events
            .Where(e => e.SeriesId == seriesId && e.StartsAt > now)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var toComeIds = toCome.Select(e => e.Id).ToList();
        var places = await db.Registrations
            .Where(r => r.MemberId == memberId && toComeIds.Contains(r.EventId))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        series.Withdraw();
        db.SeriesEnrolments.Remove(enrolment);
        var sessions = new List<Event>(places.Count);
        foreach (var place in places)
        {
            var session = toCome.Single(e => e.Id == place.EventId);
            session.ReleasePlace();
            db.Registrations.Remove(place);
            sessions.Add(session);
        }

        return new Attempt(series, enrolment, sessions, places);
    }

    /// <summary>Puts back what an attempt removed and reloads what it changed, so the next attempt reads the store.</summary>
    private async Task ForgetAsync(Attempt? attempt, CancellationToken cancellationToken)
    {
        if (attempt is null)
        {
            return;
        }

        db.SeriesEnrolments.Entry(attempt.Enrolment).State = EntityState.Detached;
        foreach (var place in attempt.Places)
        {
            db.Registrations.Entry(place).State = EntityState.Detached;
        }

        await db.EventSeries.Entry(attempt.Series).ReloadAsync(cancellationToken).ConfigureAwait(false);
        foreach (var session in attempt.Sessions)
        {
            await db.Events.Entry(session).ReloadAsync(cancellationToken).ConfigureAwait(false);
        }
    }

    private sealed record Attempt(EventSeries Series, SeriesEnrolment Enrolment, IReadOnlyList<Event> Sessions, IReadOnlyList<Registration> Places);
}
