using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>
/// The signed-in member takes a place at a published event and the answer is the event as they now
/// see it (L2-011; ADR 0032). A suspended member is refused <c>account_suspended</c>, an unknown or
/// unpublished event <c>event_not_found</c> and a full one <c>event_full</c>; registering again
/// changes nothing.
/// </summary>
public sealed record RegisterForEventCommand(Guid EventId) : IRequest<EventDetailDto>;

internal sealed class RegisterForEventHandler(IAppDbContext db, ICurrentMember current, TimeProvider time)
    : IRequestHandler<RegisterForEventCommand, EventDetailDto>
{
    public async Task<EventDetailDto> Handle(RegisterForEventCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var memberId = current.Id;
        var member = await db.Members.AsNoTracking().SingleAsync(m => m.Id == memberId, cancellationToken).ConfigureAwait(false);
        if (member.Status == MemberStatus.Suspended)
        {
            throw new RefusalException(RefusalCodes.AccountSuspended, RefusalKind.Forbidden);
        }

        var e = await db.Events
            .SingleOrDefaultAsync(x => x.Id == request.EventId && x.Status == EventStatus.Published, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.EventNotFound, RefusalKind.NotFound);
        var host = await db.DirectoryListings.AsNoTracking()
            .SingleAsync(l => l.Id == e.HostListingId, cancellationToken)
            .ConfigureAwait(false);
        var series = await EventSeriesCards.OfAsync(db, e, memberId, cancellationToken).ConfigureAwait(false);
        while (true)
        {
            var mine = await db.Registrations
                .SingleOrDefaultAsync(r => r.EventId == e.Id && r.MemberId == memberId, cancellationToken)
                .ConfigureAwait(false);
            var going = await db.Registrations.CountAsync(r => r.EventId == e.Id, cancellationToken).ConfigureAwait(false);
            if (mine is not null)
            {
                return EventDetailDto.Of(e, going, mine.Status, host, series);
            }

            if (going >= e.Capacity)
            {
                throw new RefusalException(RefusalCodes.EventFull, RefusalKind.Conflict);
            }

            mine = Registration.Of(e.Id, memberId, e.PriceCents, time.GetUtcNow());
            e.TakePlace();
            db.Registrations.Add(mine);
            try
            {
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
                return EventDetailDto.Of(e, going + 1, mine.Status, host, series);
            }
            catch (DbUpdateConcurrencyException)
            {
                // Another member took a place between this read and write (L2-011 AC3; ADR 0033):
                // forget this attempt, read the event as it now is and decide again.
                db.Registrations.Entry(mine).State = EntityState.Detached;
                await db.Events.Entry(e).ReloadAsync(cancellationToken).ConfigureAwait(false);
            }
        }
    }
}
