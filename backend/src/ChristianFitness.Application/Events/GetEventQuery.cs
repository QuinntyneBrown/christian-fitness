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
    string? ImageKey,
    string? Registration)
{
    /// <summary>The event as the caller sees it: <paramref name="mine"/> is their registration, if any (L2-010 AC3).</summary>
    public static EventDetailDto Of(Event e, int going, RegistrationStatus? mine)
    {
        ArgumentNullException.ThrowIfNull(e);
        return new(
            e.Id, e.Title, EventNames.Of(e.Category), e.StartsAt, e.Place, e.Area, e.PriceCents, e.Capacity, going, e.Summary, e.ImageKey,
            mine switch
            {
                RegistrationStatus.Confirmed => "confirmed",
                RegistrationStatus.Reserved => "reserved",
                _ => null,
            });
    }
}

/// <summary>Opens one published event; an unknown or unpublished id is 404 <c>event_not_found</c> (L2-010 AC2).</summary>
public sealed record GetEventQuery(Guid Id) : IRequest<EventDetailDto>;

internal sealed class GetEventHandler(IAppDbContext db, IRegistrationReader registrations, ICurrentMember current) : IRequestHandler<GetEventQuery, EventDetailDto>
{
    public async Task<EventDetailDto> Handle(GetEventQuery request, CancellationToken cancellationToken)
    {
        var e = await db.Events.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == request.Id && x.Status == EventStatus.Published, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.EventNotFound, RefusalKind.NotFound);
        var going = await registrations.GoingAsync(e.Id, cancellationToken).ConfigureAwait(false);
        var memberId = current.Id;
        var mine = await db.Registrations.AsNoTracking()
            .Where(r => r.EventId == e.Id && r.MemberId == memberId)
            .Select(r => (RegistrationStatus?)r.Status)
            .SingleOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);
        return EventDetailDto.Of(e, going, mine);
    }
}
