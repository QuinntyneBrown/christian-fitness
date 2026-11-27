using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Domain.Events;
using FluentValidation;
using FluentValidation.Results;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>
/// Makes a draft visible to members (L2-023 AC3, AC4; ADR 0026). A staff command, audited as
/// <c>event.published</c> (ADR 0023). Only a draft can be published, and one whose start has passed
/// must first be given a new date.
/// </summary>
public sealed record PublishEventCommand(Guid Id) : IRequest<AdminEventDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "event.published";
}

internal sealed class PublishEventHandler(IAppDbContext db, TimeProvider time, IRegistrationReader registrations, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<PublishEventCommand, AdminEventDto>
{
    public async Task<AdminEventDto> Handle(PublishEventCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var stored = await db.Events.SingleOrDefaultAsync(e => e.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        if (stored.Status != EventStatus.Draft)
        {
            throw new RefusalException(RefusalCodes.EventNotDraft, RefusalKind.Conflict);
        }

        if (stored.StartsAt <= time.GetUtcNow())
        {
            throw new ValidationException([new ValidationFailure(nameof(EventFields.Date), "Pick a start after now") { ErrorCode = EventFieldCodes.StartInPast }]);
        }

        stored.Publish(time.GetUtcNow());
        audit.Record(current.Id, nameof(Event), stored.Id);
        var going = await registrations.GoingAsync(stored.Id, cancellationToken).ConfigureAwait(false);
        var series = await AdminEventSeriesDto.OfAsync(db, [stored], cancellationToken).ConfigureAwait(false);
        return AdminEventDto.Of(stored, going, series);
    }
}
