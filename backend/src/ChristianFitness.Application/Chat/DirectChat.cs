using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Chat;

/// <summary>
/// A member opens a private conversation with another member (L2-014; slice 14.1; ADR 0043). An
/// unknown member, a suspended one and the caller themselves are answered <c>recipient_unavailable</c>.
/// A conversation is the pair, so nothing is stored by opening it.
/// </summary>
public sealed record JoinDirectCommand(Guid MemberId, Guid OtherId) : IRequest<ChatAnswer>;

/// <summary>
/// A member sends a message of 1 to 2,000 characters to another member (L2-016): refused
/// <c>message_invalid</c> outside that and <c>recipient_unavailable</c> as for a join. Only the two
/// receive it: each side's connections, keyed by the other member's id.
/// </summary>
public sealed record SendDirectMessageCommand(Guid MemberId, Guid OtherId, string? Text) : IRequest<ChatAnswer>;

/// <summary>The latest 50 messages between the caller and a member, or the 50 before the message <paramref name="Before"/>.</summary>
public sealed record GetDirectHistoryQuery(Guid OtherId, Guid? Before) : IRequest<ChatHistoryDto>;

/// <summary>The caller has opened the conversation with a member: its unread count becomes zero (ADR 0042, 0043).</summary>
public sealed record MarkDirectReadCommand(Guid OtherId) : IRequest;

internal static class DirectChat
{
    /// <summary>The other member's name when a conversation with them is possible, else <c>null</c>.</summary>
    public static Task<string?> OtherNameAsync(IAppDbContext db, Guid memberId, Guid otherId, CancellationToken cancellationToken) =>
        db.Members.AsNoTracking()
            .Where(m => m.Id == otherId && otherId != memberId && m.Status != MemberStatus.Suspended)
            .Select(m => (string?)m.Name)
            .SingleOrDefaultAsync(cancellationToken);

    public static RefusalException Unavailable() => new(RefusalCodes.RecipientUnavailable, RefusalKind.Forbidden);

    public static RefusalException Restricted() => new(RefusalCodes.MessagesRestricted, RefusalKind.Forbidden);

    /// <summary>
    /// Whether <paramref name="memberId"/> may write to <paramref name="otherId"/> (L2-065 AC5, AC11;
    /// ADR 0115): always when the other lets anyone message them, when the conversation is already
    /// open, when the two share a group chat, or when the other owns a published listing, whose
    /// Message action anyone may use; the Christian Fitness account's own conversation is read by
    /// whoever it wrote to. A member with no preferences has the default: their groups only.
    /// </summary>
    public static async Task<bool> MayStartAsync(IAppDbContext db, Guid memberId, Guid otherId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (otherId == SystemMembers.ChristianFitnessId)
        {
            return true;
        }

        var allowsAnyone = await db.MemberPreferences.AsNoTracking()
            .Where(p => p.MemberId == otherId)
            .Select(p => (bool?)p.LetAnyoneMessage)
            .SingleOrDefaultAsync(cancellationToken).ConfigureAwait(false) ?? false;
        if (allowsAnyone)
        {
            return true;
        }

        var open = await db.DirectMessages.AsNoTracking()
            .AnyAsync(m => (m.SenderId == memberId && m.RecipientId == otherId) || (m.SenderId == otherId && m.RecipientId == memberId), cancellationToken)
            .ConfigureAwait(false);
        if (open || await GroupMembership.ShareAGroupAsync(db, memberId, otherId, now, cancellationToken).ConfigureAwait(false))
        {
            return true;
        }

        return await db.DirectoryListings.AsNoTracking()
                .AnyAsync(l => l.MemberId == otherId && l.Status == Domain.Directory.ListingStatus.Published, cancellationToken).ConfigureAwait(false)
            || await db.ServiceListings.AsNoTracking().AnyAsync(l => l.MemberId == otherId, cancellationToken).ConfigureAwait(false);
    }
}

internal sealed class JoinDirectHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<JoinDirectCommand, ChatAnswer>
{
    public async Task<ChatAnswer> Handle(JoinDirectCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var name = await DirectChat.OtherNameAsync(db, request.MemberId, request.OtherId, cancellationToken).ConfigureAwait(false);
        if (name is not null && !await DirectChat.MayStartAsync(db, request.MemberId, request.OtherId, time.GetUtcNow(), cancellationToken).ConfigureAwait(false))
        {
            return ChatAnswer.Refused(RefusalCodes.MessagesRestricted);
        }

        return name is null
            ? ChatAnswer.Refused(RefusalCodes.RecipientUnavailable)
            : new ChatAnswer(null, name, request.MemberId) { System = request.OtherId == SystemMembers.ChristianFitnessId ? true : null };
    }
}

internal sealed class SendDirectMessageHandler(IAppDbContext db, IChatChannel channel, TimeProvider time)
    : IRequestHandler<SendDirectMessageCommand, ChatAnswer>
{
    public async Task<ChatAnswer> Handle(SendDirectMessageCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var otherName = await DirectChat.OtherNameAsync(db, request.MemberId, request.OtherId, cancellationToken).ConfigureAwait(false);
        if (otherName is null)
        {
            return ChatAnswer.Refused(RefusalCodes.RecipientUnavailable);
        }

        if (request.OtherId == SystemMembers.ChristianFitnessId)
        {
            return ChatAnswer.Refused(RefusalCodes.SystemAccount);
        }

        if (!await DirectChat.MayStartAsync(db, request.MemberId, request.OtherId, time.GetUtcNow(), cancellationToken).ConfigureAwait(false))
        {
            return ChatAnswer.Refused(RefusalCodes.MessagesRestricted);
        }

        if (string.IsNullOrWhiteSpace(request.Text) || request.Text.Length > SendChatMessageHandler.MaxLength)
        {
            return ChatAnswer.Refused(RefusalCodes.MessageInvalid);
        }

        var author = await db.Members.AsNoTracking()
            .Where(m => m.Id == request.MemberId)
            .Select(m => m.Name)
            .SingleAsync(cancellationToken)
            .ConfigureAwait(false);
        var stored = DirectMessage.Of(request.MemberId, request.OtherId, request.Text, time.GetUtcNow());
        db.DirectMessages.Add(stored);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await channel.SendToMemberAsync(request.OtherId, new ChatMessageDto(stored.Id, request.MemberId, request.MemberId, author, stored.Text, stored.SentAt), cancellationToken)
            .ConfigureAwait(false);
        await channel.SendToMemberAsync(request.MemberId, new ChatMessageDto(stored.Id, request.OtherId, request.MemberId, author, stored.Text, stored.SentAt), cancellationToken)
            .ConfigureAwait(false);
        return ChatAnswer.Ok;
    }
}

internal sealed class GetDirectHistoryHandler(IAppDbContext db, ICurrentMember current, TimeProvider time)
    : IRequestHandler<GetDirectHistoryQuery, ChatHistoryDto>
{
    public async Task<ChatHistoryDto> Handle(GetDirectHistoryQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var me = current.Id;
        var other = request.OtherId;
        if (await DirectChat.OtherNameAsync(db, me, other, cancellationToken).ConfigureAwait(false) is null)
        {
            throw DirectChat.Unavailable();
        }

        if (!await DirectChat.MayStartAsync(db, me, other, time.GetUtcNow(), cancellationToken).ConfigureAwait(false))
        {
            throw DirectChat.Restricted();
        }

        var messages = db.DirectMessages.AsNoTracking()
            .Where(m => (m.SenderId == me && m.RecipientId == other) || (m.SenderId == other && m.RecipientId == me));
        if (request.Before is { } before)
        {
            var cut = await messages.Where(m => m.Id == before)
                .Select(m => new { m.SentAt })
                .SingleOrDefaultAsync(cancellationToken).ConfigureAwait(false);
            if (cut is null)
            {
                return new ChatHistoryDto([], false, false);
            }

            messages = messages.Where(m => m.SentAt < cut.SentAt);
        }

        var newest = await messages
            .OrderByDescending(m => m.SentAt).ThenByDescending(m => m.Id)
            .Take(GetChatHistoryHandler.PageSize + 1)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var hasMore = newest.Count > GetChatHistoryHandler.PageSize;
        var names = await db.Members.AsNoTracking()
            .Where(m => m.Id == me || m.Id == other)
            .ToDictionaryAsync(m => m.Id, m => m.Name, cancellationToken)
            .ConfigureAwait(false);
        var page = newest.Take(GetChatHistoryHandler.PageSize).Reverse()
            .Select(m => new ChatMessageDto(m.Id, other, m.SenderId, names[m.SenderId], m.Text, m.SentAt))
            .ToList();
        return new ChatHistoryDto(page, hasMore, false);
    }
}

internal sealed class MarkDirectReadHandler(IAppDbContext db, ICurrentMember current, TimeProvider time)
    : IRequestHandler<MarkDirectReadCommand>
{
    public async Task Handle(MarkDirectReadCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (await DirectChat.OtherNameAsync(db, current.Id, request.OtherId, cancellationToken).ConfigureAwait(false) is null)
        {
            throw DirectChat.Unavailable();
        }

        // A direct conversation's marker is keyed by the other member's id in the conversation column (ADR 0043).
        var now = time.GetUtcNow();
        var marker = await db.ChatReadMarkers
            .SingleOrDefaultAsync(k => k.MemberId == current.Id && k.ScopeId == request.OtherId, cancellationToken)
            .ConfigureAwait(false);
        if (marker is null)
        {
            db.ChatReadMarkers.Add(ChatReadMarker.Of(current.Id, request.OtherId, now));
        }
        else
        {
            marker.ReadUpTo(now);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
