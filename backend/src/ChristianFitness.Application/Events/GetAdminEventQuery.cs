using System.Globalization;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>
/// An event as the editor shows it (L2-022 AC7; ADR 0025): the start as the Toronto date
/// (<c>yyyy-MM-dd</c>) and time (<c>HH:mm</c>) staff typed, the price in cents, the optional image
/// key, and how many are going.
/// </summary>
public sealed record AdminEventDetailDto(
    Guid Id,
    string Title,
    string Category,
    string Date,
    string StartTime,
    string Place,
    string Area,
    int PriceCents,
    int Capacity,
    string Summary,
    string? ImageKey,
    int Going,
    string Status);

/// <summary>Opens one event for editing (L2-022 AC7); an unknown id is 404 <c>not_found</c>.</summary>
public sealed record GetAdminEventQuery(Guid Id) : IRequest<AdminEventDetailDto>;

internal sealed class GetAdminEventHandler(IAppDbContext db, IRegistrationReader registrations) : IRequestHandler<GetAdminEventQuery, AdminEventDetailDto>
{
    public async Task<AdminEventDetailDto> Handle(GetAdminEventQuery request, CancellationToken cancellationToken)
    {
        var e = await db.Events.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        var going = await registrations.GoingAsync(e.Id, cancellationToken).ConfigureAwait(false);
        var (date, time) = EventSchedule.TorontoOf(e.StartsAt);
        return new AdminEventDetailDto(
            e.Id,
            e.Title,
            EventNames.Of(e.Category),
            date.ToString(EventFields.DateFormat, CultureInfo.InvariantCulture),
            time.ToString(EventFields.TimeFormat, CultureInfo.InvariantCulture),
            e.Place,
            e.Area,
            e.PriceCents,
            e.Capacity,
            e.Summary,
            e.ImageKey,
            going,
            EventNames.Of(e.Status));
    }
}
