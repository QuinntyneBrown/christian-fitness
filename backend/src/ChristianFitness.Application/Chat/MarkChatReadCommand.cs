using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Chat;

/// <summary>
/// The caller has opened an event's chat: its unread count becomes zero (L2-016 AC7; ADR 0042). Only a
/// member registered for the event may; anyone else, and an unknown event, is refused
/// <c>not_a_participant</c> (403).
/// </summary>
public sealed record MarkChatReadCommand(Guid EventId) : IRequest;

internal sealed class MarkChatReadHandler(IAppDbContext db, ICurrentMember current, TimeProvider time)
    : IRequestHandler<MarkChatReadCommand>
{
    public async Task Handle(MarkChatReadCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var seat = await ChatMembership.SeatAsync(db, request.EventId, current.Id, cancellationToken).ConfigureAwait(false);
        if (seat is null)
        {
            throw new RefusalException(RefusalCodes.NotAParticipant, RefusalKind.Forbidden);
        }

        var now = time.GetUtcNow();
        var marker = await db.ChatReadMarkers
            .SingleOrDefaultAsync(k => k.MemberId == current.Id && k.EventId == request.EventId, cancellationToken)
            .ConfigureAwait(false);
        if (marker is null)
        {
            db.ChatReadMarkers.Add(ChatReadMarker.Of(current.Id, request.EventId, now));
        }
        else
        {
            marker.ReadUpTo(now);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
