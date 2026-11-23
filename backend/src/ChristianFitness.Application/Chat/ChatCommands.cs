using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Chat;

/// <summary>
/// A member asks to receive an event's chat on this connection (L2-016; ADR 0039). Only a member
/// registered for the event may; anyone else is answered <c>not_a_participant</c>, the same for an
/// unknown event so the answer reveals nothing.
/// </summary>
public sealed record JoinChatCommand(Guid MemberId, Guid EventId, string ConnectionId) : IRequest<ChatAnswer>;

/// <summary>
/// A member sends a message of 1 to 2,000 characters to an event's chat (L2-016; ADR 0039): refused
/// <c>message_invalid</c> outside that, and <c>not_a_participant</c> unless registered.
/// </summary>
public sealed record SendChatMessageCommand(Guid MemberId, Guid EventId, string? Text) : IRequest<ChatAnswer>;

internal sealed class JoinChatHandler(IAppDbContext db, IChatChannel channel) : IRequestHandler<JoinChatCommand, ChatAnswer>
{
    public async Task<ChatAnswer> Handle(JoinChatCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var seat = await ChatMembership.SeatAsync(db, request.EventId, request.MemberId, cancellationToken).ConfigureAwait(false);
        if (seat is null)
        {
            return ChatAnswer.Refused(RefusalCodes.NotAParticipant);
        }

        await channel.JoinAsync(request.ConnectionId, request.MemberId, request.EventId, cancellationToken).ConfigureAwait(false);
        return new ChatAnswer(null, seat.Title, request.MemberId);
    }
}

internal sealed class SendChatMessageHandler(IAppDbContext db, IChatChannel channel, TimeProvider time)
    : IRequestHandler<SendChatMessageCommand, ChatAnswer>
{
    /// <summary>The longest message, in characters (L2-016).</summary>
    public const int MaxLength = 2000;

    public async Task<ChatAnswer> Handle(SendChatMessageCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var seat = await ChatMembership.SeatAsync(db, request.EventId, request.MemberId, cancellationToken).ConfigureAwait(false);
        if (seat is null)
        {
            return ChatAnswer.Refused(RefusalCodes.NotAParticipant);
        }

        if (seat.Cancelled)
        {
            return ChatAnswer.Refused(RefusalCodes.EventCancelled);
        }

        if (string.IsNullOrWhiteSpace(request.Text) || request.Text.Length > MaxLength)
        {
            return ChatAnswer.Refused(RefusalCodes.MessageInvalid);
        }

        var author = await db.Members.AsNoTracking()
            .Where(m => m.Id == request.MemberId)
            .Select(m => m.Name)
            .SingleAsync(cancellationToken)
            .ConfigureAwait(false);
        var stored = ChatMessage.Of(request.EventId, request.MemberId, request.Text, time.GetUtcNow());
        db.ChatMessages.Add(stored);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await channel.SendAsync(new ChatMessageDto(stored.Id, stored.EventId, stored.AuthorId, author, stored.Text, stored.SentAt), cancellationToken)
            .ConfigureAwait(false);
        return ChatAnswer.Ok;
    }
}

/// <summary>An event's chat as a participant sees it: its title and whether the event was cancelled.</summary>
internal sealed record ChatSeat(string Title, bool Cancelled);

internal static class ChatMembership
{
    /// <summary>The event's chat when the member is registered for it, else <c>null</c>: a registration is the membership (ADR 0041).</summary>
    public static Task<ChatSeat?> SeatAsync(IAppDbContext db, Guid eventId, Guid memberId, CancellationToken cancellationToken) =>
        db.Registrations.AsNoTracking()
            .Where(r => r.EventId == eventId && r.MemberId == memberId)
            .Join(db.Events, r => r.EventId, e => e.Id, (_, e) => new ChatSeat(e.Title, e.Status == EventStatus.Cancelled))
            .Cast<ChatSeat?>()
            .FirstOrDefaultAsync(cancellationToken);
}
