using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>
/// Staff record whether a registered member came to an event (L2-080 AC2, AC4, AC5; ADR 0106). A
/// staff command, audited as <c>event.attendance_recorded</c> on the event, one entry per saved
/// change. An unknown event is 404 <c>event_not_found</c>, one that has not started 409
/// <c>event_not_started</c>, a member with no registration there 404 <c>not_registered</c>. The
/// value already recorded changes nothing and records nothing. Registrations are not touched.
/// </summary>
public sealed record SetAttendanceCommand(Guid EventId, Guid MemberId, bool Came) : IRequest, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "event.attendance_recorded";
}

internal sealed class SetAttendanceHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit, TimeProvider time)
    : IRequestHandler<SetAttendanceCommand>
{
    public async Task Handle(SetAttendanceCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var e = await db.Events.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.EventId, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.EventNotFound, RefusalKind.NotFound);
        var now = time.GetUtcNow();
        if (!AttendanceRules.HasStarted(e, now))
        {
            throw new RefusalException(RefusalCodes.EventNotStarted, RefusalKind.Conflict);
        }

        if (!await db.Registrations.AnyAsync(r => r.EventId == e.Id && r.MemberId == request.MemberId, cancellationToken).ConfigureAwait(false))
        {
            throw new RefusalException(RefusalCodes.NotRegistered, RefusalKind.NotFound);
        }

        var row = await RowAsync(request, cancellationToken).ConfigureAwait(false);
        if (row is not null && row.Came == request.Came)
        {
            audit.Unchanged();
            return;
        }

        audit.Record(current.Id, nameof(Event), e.Id);
        if (row is null)
        {
            var added = Attendance.Of(e.Id, request.MemberId, request.Came, current.Id, now);
            db.Attendances.Add(added);
            try
            {
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
                return;
            }
            catch (DbUpdateException)
            {
                // Another staff member recorded this member first (the pair is unique): change theirs.
                db.Attendances.Entry(added).State = EntityState.Detached;
                row = await RowAsync(request, cancellationToken).ConfigureAwait(false)
                    ?? throw new InvalidOperationException("The attendance that refused this one is gone.");
            }
        }

        row.Record(request.Came, current.Id, now);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private Task<Attendance?> RowAsync(SetAttendanceCommand request, CancellationToken cancellationToken) =>
        db.Attendances.SingleOrDefaultAsync(a => a.EventId == request.EventId && a.MemberId == request.MemberId, cancellationToken);
}
