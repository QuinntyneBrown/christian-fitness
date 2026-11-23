using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Chat;

/// <summary>One page of an event chat's stored messages, oldest first, and whether earlier ones remain.</summary>
public sealed record ChatHistoryDto(IReadOnlyList<ChatMessageDto> Messages, bool HasMore, bool Cancelled);

/// <summary>
/// The latest <see cref="PageSize"/> messages of an event's chat, or the page before the message
/// <paramref name="Before"/> (L2-016 AC6; ADR 0040). Only a member registered for the event may read
/// it; anyone else, and an unknown event, is refused <c>not_a_participant</c> (403).
/// </summary>
public sealed record GetChatHistoryQuery(Guid EventId, Guid? Before) : IRequest<ChatHistoryDto>;

internal sealed class GetChatHistoryHandler(IAppDbContext db, ICurrentMember current) : IRequestHandler<GetChatHistoryQuery, ChatHistoryDto>
{
    /// <summary>The messages in a page (L2-016 AC6).</summary>
    public const int PageSize = 50;

    public async Task<ChatHistoryDto> Handle(GetChatHistoryQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var seat = await ChatMembership.SeatAsync(db, request.EventId, current.Id, cancellationToken).ConfigureAwait(false);
        if (seat is null)
        {
            throw new RefusalException(RefusalCodes.NotAParticipant, RefusalKind.Forbidden);
        }

        var messages = db.ChatMessages.AsNoTracking().Where(m => m.EventId == request.EventId);
        if (request.Before is { } before)
        {
            var cut = await messages.Where(m => m.Id == before)
                .Select(m => new { m.SentAt })
                .SingleOrDefaultAsync(cancellationToken).ConfigureAwait(false);
            if (cut is null)
            {
                return new ChatHistoryDto([], false, seat.Cancelled);
            }

            messages = messages.Where(m => m.SentAt < cut.SentAt);
        }

        var newest = await messages
            .OrderByDescending(m => m.SentAt).ThenByDescending(m => m.Id)
            .Take(PageSize + 1)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var hasMore = newest.Count > PageSize;
        var held = newest.Take(PageSize).Reverse().ToList();
        var authorIds = held.Select(m => m.AuthorId).Distinct().ToList();
        var names = await db.Members.AsNoTracking()
            .Where(m => authorIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, m => m.Name, cancellationToken)
            .ConfigureAwait(false);
        var page = held.Select(m => new ChatMessageDto(m.Id, m.EventId, m.AuthorId, names[m.AuthorId], m.Text, m.SentAt)).ToList();
        return new ChatHistoryDto(page, hasMore, seat.Cancelled);
    }
}
