using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Series;

/// <summary>
/// Staff restore a cancelled series date whose start has not passed (L2-071 AC5, AC9; ADR 0103).
/// A staff command, audited as <c>series.session_restored</c> on the session. A session not of the
/// series is 404 <c>not_found</c>, one that has started 409 <c>session_started</c> and one that is
/// not cancelled 409 <c>event_not_cancelled</c>. The places were kept, so those who held one hold
/// it again; the series chat is told. It answers the series and how many hold a place again.
/// </summary>
public sealed record RestoreSessionCommand(Guid SeriesId, Guid SessionId) : IRequest<SessionChangeDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "series.session_restored";
}

internal sealed class RestoreSessionHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit, SeriesDateNotices notices, TimeProvider time)
    : IRequestHandler<RestoreSessionCommand, SessionChangeDto>
{
    public async Task<SessionChangeDto> Handle(RestoreSessionCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var series = await db.EventSeries.AsNoTracking().SingleOrDefaultAsync(s => s.Id == request.SeriesId, cancellationToken).ConfigureAwait(false);
        var session = series is null
            ? null
            : await db.Events.SingleOrDefaultAsync(e => e.Id == request.SessionId && e.SeriesId == request.SeriesId, cancellationToken).ConfigureAwait(false);
        if (series is null || session is null)
        {
            throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        }

        var now = time.GetUtcNow();
        Refuse(session, now);
        audit.Record(current.Id, nameof(Event), session.Id);
        await notices.AddNoticeAsync(session, cancelled: false, cancellationToken).ConfigureAwait(false);
        while (true)
        {
            session.Restore(now);
            try
            {
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
                break;
            }
            catch (DbUpdateConcurrencyException)
            {
                // Someone changed the session in between: read it as it is and decide again.
                await db.Events.Entry(session).ReloadAsync(cancellationToken).ConfigureAwait(false);
                Refuse(session, now);
            }
        }

        await notices.PushNoticeAsync(cancellationToken).ConfigureAwait(false);
        var holders = await SeriesReads.HoldersAsync(db, series.Id, [session.Id], cancellationToken).ConfigureAwait(false);
        var answer = await AdminSeriesAnswer.OfAsync(db, series, now, cancellationToken).ConfigureAwait(false);
        return new SessionChangeDto(answer, holders[session.Id].Count());
    }

    private static void Refuse(Event session, DateTimeOffset now)
    {
        if (session.StartsAt <= now)
        {
            throw new RefusalException(RefusalCodes.SessionStarted, RefusalKind.Conflict);
        }

        if (session.Status != EventStatus.Cancelled)
        {
            throw new RefusalException(RefusalCodes.EventNotCancelled, RefusalKind.Conflict);
        }
    }
}
