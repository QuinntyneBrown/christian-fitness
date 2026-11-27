using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Domain.Events;
using MediatR;

namespace ChristianFitness.Application.Events;

/// <summary>
/// Creates an event as a draft (L2-022 AC1). A staff command, audited as <c>event.created</c>
/// (L2-019 AC3; ADR 0023).
/// </summary>
public sealed class CreateEventCommand : EventFields, IRequest<AdminEventDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "event.created";
}

/// <summary>
/// Saves the event as a draft (L2-022 AC1), its start read in Toronto (<see cref="EventSchedule"/>).
/// The body was validated before this runs (<see cref="CreateEventValidator"/>), so every field is
/// there and within its limits.
/// </summary>
internal sealed class CreateEventHandler(IAppDbContext db, TimeProvider time, ICurrentMember current, AuditTrail audit) : IRequestHandler<CreateEventCommand, AdminEventDto>
{
    public async Task<AdminEventDto> Handle(CreateEventCommand request, CancellationToken cancellationToken)
    {
        var created = Event.CreateDraft(
            request.Title,
            EventNames.CategoryOf(request.Category) ?? throw new InvalidOperationException("The validator lets no unknown category through."),
            EventSchedule.StartOf(
                request.ParsedDate() ?? throw new InvalidOperationException("The validator lets no missing date through."),
                request.ParsedStartTime() ?? throw new InvalidOperationException("The validator lets no missing time through.")),
            request.Place,
            request.Area,
            request.PriceCents ?? 0,
            request.Capacity ?? 0,
            request.Summary,
            time.GetUtcNow(),
            request.ImageKey);
        created.HostedBy(request.HostListingId ?? throw new InvalidOperationException("The validator lets no missing host through."));
        created.SuggestIn(request.SuggestionArea);

        db.Events.Add(created);
        audit.Record(current.Id, nameof(Event), created.Id);
        return AdminEventDto.Of(created, going: 0);
    }
}
