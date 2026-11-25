using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Chat;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>
/// Withdraws a published event (L2-023 AC2; ADR 0035). A staff command, audited as
/// <c>event.cancelled</c> (ADR 0023). Only a published event can be cancelled. Registrations are
/// kept, so registered members still see it, marked cancelled, in their Profile.
/// </summary>
public sealed record CancelEventCommand(Guid Id) : IRequest<AdminEventDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "event.cancelled";
}

internal sealed class CancelEventHandler(IAppDbContext db, IRegistrationReader registrations, ICurrentMember current, AuditTrail audit, IChatChannel chat)
    : IRequestHandler<CancelEventCommand, AdminEventDto>
{
    public async Task<AdminEventDto> Handle(CancelEventCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var stored = await db.Events.SingleOrDefaultAsync(e => e.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        if (stored.Status != EventStatus.Published)
        {
            throw new RefusalException(RefusalCodes.EventNotPublished, RefusalKind.Conflict);
        }

        audit.Record(current.Id, nameof(Event), stored.Id);
        while (true)
        {
            stored.Cancel();
            try
            {
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
                break;
            }
            catch (DbUpdateConcurrencyException)
            {
                // A member registered or cancelled in between: read the event as it is and decide again.
                await db.Events.Entry(stored).ReloadAsync(cancellationToken).ConfigureAwait(false);
                if (stored.Status != EventStatus.Published)
                {
                    throw new RefusalException(RefusalCodes.EventNotPublished, RefusalKind.Conflict);
                }
            }
        }

        await chat.NotifyCancelledAsync(stored.Id, cancellationToken).ConfigureAwait(false);
        var going = await registrations.GoingAsync(stored.Id, cancellationToken).ConfigureAwait(false);
        var series = await AdminEventSeriesDto.OfAsync(db, [stored], cancellationToken).ConfigureAwait(false);
        return AdminEventDto.Of(stored, going, series);
    }
}
