using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Series;

/// <summary>
/// The signed-in member joins a series and the answer is the series as they now see it (L2-052 AC2,
/// AC4 to AC7; ADR 0101). Joining records one enrolment and a place at every session still to come
/// that is not cancelled and that the member does not already hold, at the series price (reserved
/// when it is above 0); a place already held keeps its own price and status. A suspended member is
/// refused <c>account_suspended</c>, a series that does not open <c>series_not_found</c>, and one
/// with no place left or no session to come <c>series_full</c>; joining again changes nothing.
/// </summary>
public sealed record JoinSeriesCommand(Guid SeriesId) : IRequest<SeriesDetailDto>;

internal sealed class JoinSeriesHandler(IAppDbContext db, IRegistrationReader registrations, ICurrentMember current, TimeProvider time)
    : IRequestHandler<JoinSeriesCommand, SeriesDetailDto>
{
    /// <summary>How many times a join that lost a race reads the series again before it gives up.</summary>
    public const int Attempts = 3;

    public async Task<SeriesDetailDto> Handle(JoinSeriesCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var memberId = current.Id;
        var member = await db.Members.AsNoTracking().SingleAsync(m => m.Id == memberId, cancellationToken).ConfigureAwait(false);
        if (member.Status == MemberStatus.Suspended)
        {
            throw new RefusalException(RefusalCodes.AccountSuspended, RefusalKind.Forbidden);
        }

        for (var attempt = 1; ; attempt++)
        {
            var added = await TryJoinAsync(request.SeriesId, memberId, cancellationToken).ConfigureAwait(false);
            try
            {
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
                return await SeriesDetails.OfAsync(db, registrations, request.SeriesId, memberId, time.GetUtcNow(), cancellationToken).ConfigureAwait(false);
            }
            catch (DbUpdateException) when (attempt < Attempts)
            {
                // Another join, drop-in or leave committed between this read and write (ADR 0033,
                // ADR 0101): forget this attempt, read the series as it now is and decide again.
                await ForgetAsync(added, cancellationToken).ConfigureAwait(false);
            }
        }
    }

    /// <summary>
    /// Adds the enrolment and the places for one attempt and answers what it touched; refuses as the
    /// rules say. A member who already joined touches nothing.
    /// </summary>
    private async Task<Attempt> TryJoinAsync(Guid seriesId, Guid memberId, CancellationToken cancellationToken)
    {
        var series = await db.EventSeries.SingleOrDefaultAsync(s => s.Id == seriesId, cancellationToken).ConfigureAwait(false);
        var sessions = series is null
            ? []
            : await db.Events.Where(e => e.SeriesId == seriesId).ToListAsync(cancellationToken).ConfigureAwait(false);
        if (series is null || sessions.All(s => s.Status != EventStatus.Published))
        {
            throw new RefusalException(RefusalCodes.SeriesNotFound, RefusalKind.NotFound);
        }

        if (await db.SeriesEnrolments.AnyAsync(x => x.SeriesId == seriesId && x.MemberId == memberId, cancellationToken).ConfigureAwait(false))
        {
            return new Attempt(series, sessions, null, []);
        }

        var now = time.GetUtcNow();
        var toCome = sessions.Where(s => s.Status == EventStatus.Published && s.StartsAt > now).ToList();
        var toComeIds = toCome.Select(s => s.Id).ToList();
        var held = await db.Registrations
            .Where(r => r.MemberId == memberId && toComeIds.Contains(r.EventId))
            .Select(r => r.EventId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var needed = toCome.Where(s => !held.Contains(s.Id)).ToList();
        var going = await registrations.GoingForAsync([.. needed.Select(s => s.Id)], cancellationToken).ConfigureAwait(false);
        var spotsLeft = SeriesPlaces.SpotsLeft(
            series.Capacity,
            needed.Select(s => (new SessionTimes(s.StartsAt, s.EndsAt, false), going.GetValueOrDefault(s.Id))),
            now);
        if (toCome.Count == 0 || spotsLeft == 0)
        {
            throw new RefusalException(RefusalCodes.SeriesFull, RefusalKind.Conflict);
        }

        series.Enrol();
        var enrolment = SeriesEnrolment.Of(series.Id, memberId, series.PriceCents, now);
        db.SeriesEnrolments.Add(enrolment);
        var places = new List<Registration>(needed.Count);
        foreach (var session in needed)
        {
            session.TakePlace();
            var place = Registration.Of(session.Id, memberId, series.PriceCents, now);
            db.Registrations.Add(place);
            places.Add(place);
        }

        return new Attempt(series, sessions, enrolment, places);
    }

    /// <summary>Detaches what an attempt added and reloads what it changed, so the next attempt reads the store.</summary>
    private async Task ForgetAsync(Attempt attempt, CancellationToken cancellationToken)
    {
        if (attempt.Enrolment is not null)
        {
            db.SeriesEnrolments.Entry(attempt.Enrolment).State = EntityState.Detached;
        }

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

    private sealed record Attempt(EventSeries Series, IReadOnlyList<Event> Sessions, SeriesEnrolment? Enrolment, IReadOnlyList<Registration> Places);
}
