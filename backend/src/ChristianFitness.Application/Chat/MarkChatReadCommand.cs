using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Chat;

/// <summary>
/// The caller has opened a group chat: its unread count becomes zero (L2-016 AC7; ADR 0042). The chat
/// is named by its id: a standalone event's or a series' (ADR 0099). Only a member of the chat may;
/// anyone else, and an unknown id, is refused <c>not_a_participant</c> (403).
/// </summary>
public sealed record MarkChatReadCommand(Guid ChatId) : IRequest;

internal sealed class MarkChatReadHandler(IAppDbContext db, ICurrentMember current, TimeProvider time)
    : IRequestHandler<MarkChatReadCommand>
{
    public async Task Handle(MarkChatReadCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var now = time.GetUtcNow();
        var seat = await ChatMembership.SeatAsync(db, request.ChatId, current.Id, now, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotAParticipant, RefusalKind.Forbidden);

        var scopeId = seat.Scope.Id;
        var marker = await db.ChatReadMarkers
            .SingleOrDefaultAsync(k => k.MemberId == current.Id && k.ScopeId == scopeId, cancellationToken)
            .ConfigureAwait(false);
        if (marker is null)
        {
            db.ChatReadMarkers.Add(ChatReadMarker.Of(current.Id, scopeId, now));
        }
        else
        {
            marker.ReadUpTo(now);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
