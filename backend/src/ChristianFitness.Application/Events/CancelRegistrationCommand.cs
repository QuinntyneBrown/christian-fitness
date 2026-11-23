using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Chat;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>
/// The signed-in member gives up their place at a published event before it starts and the answer is
/// the event as they now see it (L2-012; ADR 0034). Once the event has started it is refused
/// <c>event_started</c> and an unknown or unpublished event <c>event_not_found</c>; with no place to
/// give up nothing changes.
/// </summary>
public sealed record CancelRegistrationCommand(Guid EventId) : IRequest<EventDetailDto>;

internal sealed class CancelRegistrationHandler(IAppDbContext db, ICurrentMember current, TimeProvider time, IChatChannel chat)
    : IRequestHandler<CancelRegistrationCommand, EventDetailDto>
{
    public async Task<EventDetailDto> Handle(CancelRegistrationCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var memberId = current.Id;
        var e = await db.Events
            .SingleOrDefaultAsync(x => x.Id == request.EventId && x.Status == EventStatus.Published, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.EventNotFound, RefusalKind.NotFound);
        while (true)
        {
            var mine = await db.Registrations
                .SingleOrDefaultAsync(r => r.EventId == e.Id && r.MemberId == memberId, cancellationToken)
                .ConfigureAwait(false);
            var going = await db.Registrations.CountAsync(r => r.EventId == e.Id, cancellationToken).ConfigureAwait(false);
            if (mine is null)
            {
                return EventDetailDto.Of(e, going, null);
            }

            if (time.GetUtcNow() >= e.StartsAt)
            {
                throw new RefusalException(RefusalCodes.EventStarted, RefusalKind.Conflict);
            }

            e.ReleasePlace();
            db.Registrations.Remove(mine);
            try
            {
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
                await chat.LeaveAsync(memberId, e.Id, cancellationToken).ConfigureAwait(false);
                return EventDetailDto.Of(e, going - 1, null);
            }
            catch (DbUpdateConcurrencyException)
            {
                // Another member registered or cancelled in between: read the event as it is and decide again.
                db.Registrations.Entry(mine).State = EntityState.Unchanged;
                await db.Events.Entry(e).ReloadAsync(cancellationToken).ConfigureAwait(false);
            }
        }
    }
}
