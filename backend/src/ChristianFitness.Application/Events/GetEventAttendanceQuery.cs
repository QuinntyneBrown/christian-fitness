using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>One registered member on the Attendance tab: who, and whether staff recorded that they came (L2-080 AC1; ADR 0106).</summary>
public sealed record AttendanceRowDto(Guid MemberId, string Name, bool Came);

/// <summary>
/// An event's attendance (L2-080 AC1, AC5, AC6; ADR 0106): its title and start, whether it has
/// started by the API's clock, how many are registered, how many came, and, once started, every
/// registered member by name. Before the start nobody is listed.
/// </summary>
public sealed record EventAttendanceDto(
    Guid EventId,
    string Title,
    DateTimeOffset StartsAt,
    bool Started,
    int Registered,
    int Came,
    IReadOnlyList<AttendanceRowDto> Items);

/// <summary>Opens an event's attendance; an unknown event is 404 <c>event_not_found</c>.</summary>
public sealed record GetEventAttendanceQuery(Guid Id) : IRequest<EventAttendanceDto>
{
    /// <summary>The most rows one answer holds, as Registrations (ADR 0036).</summary>
    public const int Limit = 500;
}

internal sealed class GetEventAttendanceHandler(IAppDbContext db, TimeProvider time)
    : IRequestHandler<GetEventAttendanceQuery, EventAttendanceDto>
{
    public async Task<EventAttendanceDto> Handle(GetEventAttendanceQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var e = await db.Events.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.EventNotFound, RefusalKind.NotFound);
        var started = AttendanceRules.HasStarted(e, time.GetUtcNow());
        var registered = await db.Registrations.AsNoTracking().CountAsync(r => r.EventId == e.Id, cancellationToken).ConfigureAwait(false);
        var came = await db.Attendances.AsNoTracking()
            .Where(a => a.EventId == e.Id && a.Came)
            .Join(db.Registrations.Where(r => r.EventId == e.Id), a => a.MemberId, r => r.MemberId, (a, _) => a.Id)
            .CountAsync(cancellationToken)
            .ConfigureAwait(false);
        if (!started)
        {
            return new EventAttendanceDto(e.Id, e.Title, e.StartsAt, false, registered, came, []);
        }

        var rows = await db.Registrations.AsNoTracking()
            .Where(r => r.EventId == e.Id)
            .Join(db.Members, r => r.MemberId, m => m.Id, (r, m) => new
            {
                m.Id,
                m.Name,
                Came = db.Attendances.Any(a => a.EventId == r.EventId && a.MemberId == m.Id && a.Came),
            })
            .OrderBy(r => r.Name)
            .ThenBy(r => r.Id)
            .Take(GetEventAttendanceQuery.Limit)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return new EventAttendanceDto(e.Id, e.Title, e.StartsAt, true, registered, came, [.. rows.Select(r => new AttendanceRowDto(r.Id, r.Name, r.Came))]);
    }
}
