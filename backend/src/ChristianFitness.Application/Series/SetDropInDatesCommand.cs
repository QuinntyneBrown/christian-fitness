using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Chat;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Series;

/// <summary>
/// The signed-in member's dates still to come of a series become exactly <see cref="SessionIds"/>,
/// all or none, and the answer is the series as they now see it (L2-053 AC2, AC4, AC6; ADR 0102).
/// A newly ticked date takes a place as L2-011 states for an event: at the session's capacity, at
/// the drop-in price (the series price for a joined member), reserved when it is above 0. A held
/// date to come that is left out gives its place up as L2-012 states; a held date that has started
/// or is cancelled (ADR 0103) is kept whatever the set says. Refusals: 404 <c>series_not_found</c>, 400
/// <c>sessions_invalid</c>, 403 <c>account_suspended</c> when adding, and 409 <c>event_full</c>
/// with a <c>sessions</c> extension of the full dates' numbers.
/// </summary>
public sealed record SetDropInDatesCommand(Guid SeriesId, IReadOnlyList<Guid> SessionIds) : IRequest<SeriesDetailDto>;

internal sealed class SetDropInDatesHandler(IAppDbContext db, IRegistrationReader registrations, ICurrentMember current, TimeProvider time, IChatChannel chat)
    : IRequestHandler<SetDropInDatesCommand, SeriesDetailDto>
{
    /// <summary>How many times a change that lost a race reads the series again before it gives up.</summary>
    public const int Attempts = 3;

    public async Task<SeriesDetailDto> Handle(SetDropInDatesCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var memberId = current.Id;
        for (var attempt = 1; ; attempt++)
        {
            var change = await TryChangeAsync(request, memberId, cancellationToken).ConfigureAwait(false);
            try
            {
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
                var scope = ChatScope.OfSeries(request.SeriesId);
                if (change.Removed.Count > 0 && !await ChatMembership.InAsync(db, scope, memberId, time.GetUtcNow(), cancellationToken).ConfigureAwait(false))
                {
                    // No enrolment and no date not ended keeps them in the series chat (L2-053 AC4; ADR 0101).
                    await chat.LeaveAsync(memberId, scope, cancellationToken).ConfigureAwait(false);
                }

                return await SeriesDetails.OfAsync(db, registrations, request.SeriesId, memberId, time.GetUtcNow(), cancellationToken).ConfigureAwait(false);
            }
            catch (DbUpdateException) when (attempt < Attempts)
            {
                // Another registration, join or leave committed between this read and write (ADR 0033,
                // ADR 0101): forget this attempt, read the series as it now is and decide again.
                await ForgetAsync(change, cancellationToken).ConfigureAwait(false);
            }
        }
    }

    /// <summary>Adds and removes the member's places for one attempt and answers what it touched; refuses as the rules say.</summary>
    private async Task<Change> TryChangeAsync(SetDropInDatesCommand request, Guid memberId, CancellationToken cancellationToken)
    {
        var series = await db.EventSeries.AsNoTracking().SingleOrDefaultAsync(s => s.Id == request.SeriesId, cancellationToken).ConfigureAwait(false);
        var sessions = series is null
            ? []
            : await db.Events.Where(e => e.SeriesId == request.SeriesId).OrderBy(e => e.StartsAt).ThenBy(e => e.Id).ToListAsync(cancellationToken).ConfigureAwait(false);
        if (series is null || sessions.All(s => s.Status != EventStatus.Published))
        {
            throw new RefusalException(RefusalCodes.SeriesNotFound, RefusalKind.NotFound);
        }

        var now = time.GetUtcNow();
        var sessionIds = sessions.Select(s => s.Id).ToList();
        var mine = await db.Registrations
            .Where(r => r.MemberId == memberId && sessionIds.Contains(r.EventId))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var held = mine.Select(r => r.EventId).ToHashSet();
        var wanted = request.SessionIds.ToHashSet();
        var valid = wanted.Count == request.SessionIds.Count
            && request.SessionIds.All(id => sessions.Exists(s => s.Id == id && s.Status == EventStatus.Published && (s.StartsAt > now || held.Contains(id))));
        if (!valid)
        {
            throw new RefusalException(RefusalCodes.SessionsInvalid, RefusalKind.BadRequest);
        }

        var added = sessions.Where(s => wanted.Contains(s.Id) && !held.Contains(s.Id)).ToList();
        // A started date is kept, and so is a cancelled one, which a restore holds again (ADR 0103).
        var removed = mine
            .Where(r => !wanted.Contains(r.EventId) && sessions.Single(s => s.Id == r.EventId) is { Status: EventStatus.Published } s && s.StartsAt > now)
            .ToList();
        var joined = false;
        if (added.Count > 0)
        {
            var member = await db.Members.AsNoTracking().SingleAsync(m => m.Id == memberId, cancellationToken).ConfigureAwait(false);
            if (member.Status == MemberStatus.Suspended)
            {
                throw new RefusalException(RefusalCodes.AccountSuspended, RefusalKind.Forbidden);
            }

            joined = await db.SeriesEnrolments.AnyAsync(e => e.SeriesId == series.Id && e.MemberId == memberId, cancellationToken).ConfigureAwait(false);
            if (!joined && series.DropInPriceCents is null)
            {
                throw new RefusalException(RefusalCodes.SessionsInvalid, RefusalKind.BadRequest);
            }

            var going = await registrations.GoingForAsync([.. added.Select(s => s.Id)], cancellationToken).ConfigureAwait(false);
            var full = added.Where(s => going.GetValueOrDefault(s.Id) >= s.Capacity).Select(s => sessions.IndexOf(s) + 1).ToList();
            if (full.Count > 0)
            {
                // All or none (L2-053 AC2): the refusal names every date that filled, by its number (ADR 0102).
                throw new RefusalException(RefusalCodes.EventFull, RefusalKind.Conflict)
                {
                    Extensions = new Dictionary<string, object?> { ["sessions"] = full },
                };
            }
        }

        var places = new List<Registration>(added.Count);
        foreach (var session in added)
        {
            session.TakePlace();
            var place = Registration.Of(session.Id, memberId, joined ? series.PriceCents : session.PriceCents, now);
            db.Registrations.Add(place);
            places.Add(place);
        }

        foreach (var place in removed)
        {
            sessions.Single(s => s.Id == place.EventId).ReleasePlace();
            db.Registrations.Remove(place);
        }

        return new Change(sessions, places, removed);
    }

    /// <summary>Detaches what an attempt added and removed and reloads its sessions, so the next attempt reads the store.</summary>
    private async Task ForgetAsync(Change change, CancellationToken cancellationToken)
    {
        foreach (var place in change.Added.Concat(change.Removed))
        {
            db.Registrations.Entry(place).State = EntityState.Detached;
        }

        foreach (var session in change.Sessions)
        {
            await db.Events.Entry(session).ReloadAsync(cancellationToken).ConfigureAwait(false);
        }
    }

    private sealed record Change(IReadOnlyList<Event> Sessions, IReadOnlyList<Registration> Added, IReadOnlyList<Registration> Removed);
}
