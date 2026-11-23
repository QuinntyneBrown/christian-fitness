using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>An event as a member's detail screen shows it (L2-010 AC1; ADR 0031); the app words the date and the price.</summary>
public sealed record EventDetailDto(
    Guid Id,
    string Title,
    string Category,
    DateTimeOffset StartsAt,
    string Place,
    string Area,
    int PriceCents,
    int Capacity,
    int Going,
    string Summary,
    string? ImageKey);

/// <summary>Opens one published event; an unknown or unpublished id is 404 <c>event_not_found</c> (L2-010 AC2).</summary>
public sealed record GetEventQuery(Guid Id) : IRequest<EventDetailDto>;

internal sealed class GetEventHandler(IAppDbContext db, IRegistrationReader registrations) : IRequestHandler<GetEventQuery, EventDetailDto>
{
    public async Task<EventDetailDto> Handle(GetEventQuery request, CancellationToken cancellationToken)
    {
        var e = await db.Events.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == request.Id && x.Status == EventStatus.Published, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.EventNotFound, RefusalKind.NotFound);
        var going = await registrations.GoingAsync(e.Id, cancellationToken).ConfigureAwait(false);
        return new EventDetailDto(
            e.Id, e.Title, EventNames.Of(e.Category), e.StartsAt, e.Place, e.Area, e.PriceCents, e.Capacity, going, e.Summary, e.ImageKey);
    }
}
