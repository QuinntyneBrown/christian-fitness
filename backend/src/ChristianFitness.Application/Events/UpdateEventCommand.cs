using System.Text.Json.Serialization;
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
/// Saves changes to an event (L2-022 AC7; ADR 0025): the editor's fields, the event named by the
/// address. A staff command, audited as <c>event.updated</c> (L2-019 AC3; ADR 0023). It never
/// changes the status.
/// </summary>
public sealed class UpdateEventCommand : EventFields, IRequest<AdminEventDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "event.updated";

    /// <summary>The event to change, from the address; never read from the body.</summary>
    [JsonIgnore]
    public Guid Id { get; set; }
}

/// <summary>The rules of an edit; the start is checked by the handler, which knows what was stored.</summary>
public sealed class UpdateEventValidator(TimeProvider time, IImageStore images) : EventFieldsValidator<UpdateEventCommand>(time, images, refusePastStart: false)
{
}

/// <summary>
/// Replaces the event's fields (L2-022 AC7). A start in the past is refused only when the date or
/// time changed, so staff can still correct an event that has begun; a capacity below the members
/// going is refused with <c>capacity_below_going</c> (L2-022 AC3).
/// </summary>
internal sealed class UpdateEventHandler(IAppDbContext db, TimeProvider time, IRegistrationReader registrations, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<UpdateEventCommand, AdminEventDto>
{
    public async Task<AdminEventDto> Handle(UpdateEventCommand request, CancellationToken cancellationToken)
    {
        var stored = await db.Events.SingleOrDefaultAsync(e => e.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        var startsAt = EventSchedule.StartOf(
            request.ParsedDate() ?? throw new InvalidOperationException("The validator lets no missing date through."),
            request.ParsedStartTime() ?? throw new InvalidOperationException("The validator lets no missing time through."));
        if (startsAt != stored.StartsAt && startsAt <= time.GetUtcNow())
        {
            throw Refused(nameof(EventFields.Date), EventFieldCodes.StartInPast, "Pick a start after now");
        }

        var going = await registrations.GoingAsync(stored.Id, cancellationToken).ConfigureAwait(false);
        var capacity = request.Capacity ?? throw new InvalidOperationException("The validator lets no missing capacity through.");
        if (capacity < going)
        {
            throw new RefusalException(RefusalCodes.CapacityBelowGoing, RefusalKind.Conflict);
        }

        stored.Edit(
            request.Title,
            EventNames.CategoryOf(request.Category) ?? throw new InvalidOperationException("The validator lets no unknown category through."),
            startsAt,
            request.Place,
            request.Area,
            request.PriceCents ?? 0,
            capacity,
            request.Summary,
            request.ImageKey);
        if (request.HostListingId is { } host)
        {
            stored.HostedBy(host);
        }

        audit.Record(current.Id, nameof(Event), stored.Id);
        return AdminEventDto.Of(stored, going);
    }

    private static ValidationException Refused(string property, string code, string message) =>
        new([new ValidationFailure(property, message) { ErrorCode = code }]);
}
