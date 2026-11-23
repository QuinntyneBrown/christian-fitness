using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
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
        var title = await ChatMembership.TitleForAsync(db, request.EventId, request.MemberId, cancellationToken).ConfigureAwait(false);
        if (title is null)
        {
            return ChatAnswer.Refused(RefusalCodes.NotAParticipant);
        }

        await channel.JoinAsync(request.ConnectionId, request.EventId, cancellationToken).ConfigureAwait(false);
        return new ChatAnswer(null, title, request.MemberId);
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
        if (await ChatMembership.TitleForAsync(db, request.EventId, request.MemberId, cancellationToken).ConfigureAwait(false) is null)
        {
            return ChatAnswer.Refused(RefusalCodes.NotAParticipant);
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
        var sentAt = time.GetUtcNow();
        await channel.SendAsync(new ChatMessageDto(Guid.CreateVersion7(sentAt), request.EventId, request.MemberId, author, request.Text, sentAt), cancellationToken)
            .ConfigureAwait(false);
        return ChatAnswer.Ok;
    }
}

internal static class ChatMembership
{
    /// <summary>The event's title when the member is registered for it, else <c>null</c>.</summary>
    public static Task<string?> TitleForAsync(IAppDbContext db, Guid eventId, Guid memberId, CancellationToken cancellationToken) =>
        db.Registrations.AsNoTracking()
            .Where(r => r.EventId == eventId && r.MemberId == memberId)
            .Join(db.Events, r => r.EventId, e => e.Id, (_, e) => e.Title)
            .Cast<string?>()
            .FirstOrDefaultAsync(cancellationToken);
}
