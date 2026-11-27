using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Directory;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>
/// The listing that hosts an event, as the "Hosted by" card shows it (L2-010 AC4; ADR 0089): the
/// field names are the directory's, and the app works out the initials.
/// </summary>
public sealed record EventHostCardDto(Guid Id, string Kind, string Name, bool IsVerified, string? PhotoKey)
{
    public static EventHostCardDto Of(DirectoryListing listing)
    {
        ArgumentNullException.ThrowIfNull(listing);
        return new(listing.Id, ListingKinds.SlugOf(listing.Kind), listing.Name, listing.IsVerified, listing.PhotoKey);
    }
}

/// <summary>
/// An event as a member's detail screen shows it (L2-010 AC1, AC4 to AC6; ADR 0031, ADR 0089,
/// ADR 0096); the app words the date and the price. <see cref="Series"/> is a session's series
/// card, none for a standalone event. <see cref="Attendees"/> names up to five members going who
/// show themselves on attendee lists (L2-065 AC4; <see cref="AttendeeList"/>).
/// </summary>
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
    string? Registration,
    EventHostCardDto Host,
    EventSeriesCardDto? Series,
    IReadOnlyList<string> Attendees)
{
    /// <summary>The event as the caller sees it: <paramref name="mine"/> is their registration, if any (L2-010 AC3).</summary>
    public static EventDetailDto Of(Event e, int going, RegistrationStatus? mine, DirectoryListing host, EventSeriesCardDto? series, IReadOnlyList<string> attendees)
    {
        ArgumentNullException.ThrowIfNull(e);
        return new(
            e.Id, e.Title, EventNames.Of(e.Category), e.StartsAt, e.Place, e.Area, e.PriceCents, e.Capacity, going, e.Summary, e.ImageKey,
            mine switch
            {
                RegistrationStatus.Confirmed => "confirmed",
                RegistrationStatus.Reserved => "reserved",
                _ => null,
            },
            EventHostCardDto.Of(host),
            series,
            attendees);
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
        // The foreign key guarantees the host; it is shown whatever the listing's status (ADR 0089).
        var host = await db.DirectoryListings.AsNoTracking()
            .SingleAsync(l => l.Id == e.HostListingId, cancellationToken)
            .ConfigureAwait(false);
        var series = await EventSeriesCards.OfAsync(db, e, memberId, cancellationToken).ConfigureAwait(false);
        var attendees = await AttendeeList.NamesAsync(db, e.Id, cancellationToken).ConfigureAwait(false);
        return EventDetailDto.Of(e, going, mine, host, series, attendees);
    }
}
