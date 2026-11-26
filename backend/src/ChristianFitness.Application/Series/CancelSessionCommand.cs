using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Series;

/// <summary>
/// Staff cancel one date of a series (L2-071 AC4, AC9; ADR 0103). A staff command, audited as
/// <c>series.session_cancelled</c> on the session, whose <c>SeriesId</c> names the series. A session
/// not of the series is 404 <c>not_found</c>, one that has started 409 <c>session_started</c> and one
/// that is not published 409 <c>event_not_published</c>. The places are kept, so a Restore gives them
/// back (ADR 0035). It answers the series as the page shows it and how many members were told.
/// </summary>
public sealed record CancelSessionCommand(Guid SeriesId, Guid SessionId) : IRequest<SessionChangeDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "series.session_cancelled";
}

internal sealed class CancelSessionHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit, TimeProvider time)
    : IRequestHandler<CancelSessionCommand, SessionChangeDto>
{
    public async Task<SessionChangeDto> Handle(CancelSessionCommand request, CancellationToken cancellationToken)
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
        while (true)
        {
            session.Cancel();
            try
            {
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
                break;
            }
            catch (DbUpdateConcurrencyException)
            {
                // A member joined, dropped in or left in between: read the session as it is and decide again.
                await db.Events.Entry(session).ReloadAsync(cancellationToken).ConfigureAwait(false);
                Refuse(session, now);
            }
        }

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

        if (session.Status != EventStatus.Published)
        {
            throw new RefusalException(RefusalCodes.EventNotPublished, RefusalKind.Conflict);
        }
    }
}
