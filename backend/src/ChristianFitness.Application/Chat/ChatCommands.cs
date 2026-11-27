using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Chat;

/// <summary>
/// A member asks to receive a group chat on this connection (L2-016; ADR 0039). The chat is named by
/// its id: a standalone event's or a series' (ADR 0101). Only a member of the chat may; anyone else
/// is answered <c>not_a_participant</c>, the same for an unknown id so the answer reveals nothing.
/// </summary>
public sealed record JoinChatCommand(Guid MemberId, Guid ChatId, string ConnectionId) : IRequest<ChatAnswer>;

/// <summary>
/// A member sends a message of 1 to 2,000 characters to a group chat (L2-016; ADR 0039): refused
/// <c>message_invalid</c> outside that, and <c>not_a_participant</c> unless a member of it.
/// </summary>
public sealed record SendChatMessageCommand(Guid MemberId, Guid ChatId, string? Text) : IRequest<ChatAnswer>;

internal sealed class JoinChatHandler(IAppDbContext db, IChatChannel channel, TimeProvider time) : IRequestHandler<JoinChatCommand, ChatAnswer>
{
    public async Task<ChatAnswer> Handle(JoinChatCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var seat = await ChatMembership.SeatAsync(db, request.ChatId, request.MemberId, time.GetUtcNow(), cancellationToken).ConfigureAwait(false);
        if (seat is null)
        {
            return ChatAnswer.Refused(RefusalCodes.NotAParticipant);
        }

        await channel.JoinAsync(request.ConnectionId, request.MemberId, seat.Scope, cancellationToken).ConfigureAwait(false);
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
        var seat = await ChatMembership.SeatAsync(db, request.ChatId, request.MemberId, time.GetUtcNow(), cancellationToken).ConfigureAwait(false);
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
        var stored = ChatMessage.Of(seat.Scope, request.MemberId, request.Text, time.GetUtcNow());
        db.ChatMessages.Add(stored);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await channel.SendAsync(seat.Scope, new ChatMessageDto(stored.Id, stored.ScopeId, stored.AuthorId, author, stored.Text, stored.SentAt), cancellationToken)
            .ConfigureAwait(false);
        return ChatAnswer.Ok;
    }
}

/// <summary>A group chat as one of its members sees it: its scope, its title and whether it is closed because the event was cancelled.</summary>
internal sealed record ChatSeat(ChatScope Scope, string Title, bool Cancelled);

/// <summary>A group chat a member belongs to, as the Messages list and Home count it: since when they belong.</summary>
internal sealed record ChatRoom(ChatScope Scope, string Title, DateTimeOffset Since);

/// <summary>
/// Who is in a group chat (ADR 0041, ADR 0080, ADR 0101). A standalone event's chat holds the members
/// registered for it. A series' one chat holds the members who joined the series and those who hold
/// a place at one of its sessions that has not ended (its end, else its start, after now); a session
/// has no chat of its own.
/// </summary>
internal static class ChatMembership
{
    /// <summary>The chat whose id is <paramref name="chatId"/> when the member is in it, else <c>null</c>.</summary>
    public static async Task<ChatSeat?> SeatAsync(IAppDbContext db, Guid chatId, Guid memberId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        // A deleting member has left every group chat (L2-066 AC6; ADR 0118).
        if (await db.Members.AsNoTracking().AnyAsync(m => m.Id == memberId && m.DeletionRequestedAt != null, cancellationToken).ConfigureAwait(false))
        {
            return null;
        }

        var series = await db.EventSeries.AsNoTracking()
            .Where(s => s.Id == chatId)
            .Select(s => s.Title)
            .SingleOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);
        if (series is not null)
        {
            return await InSeriesAsync(db, chatId, memberId, now, cancellationToken).ConfigureAwait(false)
                ? new ChatSeat(ChatScope.OfSeries(chatId), series, false)
                : null;
        }

        var held = await db.Registrations.AsNoTracking()
            .Where(r => r.EventId == chatId && r.MemberId == memberId)
            .Join(db.Events.Where(e => e.SeriesId == null), r => r.EventId, e => e.Id, (_, e) => new { e.Title, Cancelled = e.Status == EventStatus.Cancelled })
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);
        return held is null ? null : new ChatSeat(ChatScope.OfEvent(chatId), held.Title, held.Cancelled);
    }

    /// <summary>Whether the member is in the chat of <paramref name="scope"/>.</summary>
    public static async Task<bool> InAsync(IAppDbContext db, ChatScope scope, Guid memberId, DateTimeOffset now, CancellationToken cancellationToken) =>
        scope.Kind == ChatScopeKind.Series
            ? await InSeriesAsync(db, scope.Id, memberId, now, cancellationToken).ConfigureAwait(false)
            : await db.Registrations.AnyAsync(r => r.EventId == scope.Id && r.MemberId == memberId, cancellationToken).ConfigureAwait(false);

    /// <summary>Whether the member joined the series or holds a place at one of its sessions that has not ended.</summary>
    public static async Task<bool> InSeriesAsync(IAppDbContext db, Guid seriesId, Guid memberId, DateTimeOffset now, CancellationToken cancellationToken) =>
        await db.SeriesEnrolments.AnyAsync(x => x.SeriesId == seriesId && x.MemberId == memberId, cancellationToken).ConfigureAwait(false)
        || await db.Registrations
            .Where(r => r.MemberId == memberId)
            .Join(db.Events.Where(e => e.SeriesId == seriesId && (e.EndsAt ?? e.StartsAt) > now), r => r.EventId, e => e.Id, (r, _) => r.Id)
            .AnyAsync(cancellationToken)
            .ConfigureAwait(false);

    /// <summary>Every group chat the member is in, with since when: the first registration or enrolment that put them there.</summary>
    public static async Task<List<ChatRoom>> RoomsOfAsync(IAppDbContext db, Guid memberId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var places = await db.Registrations.AsNoTracking()
            .Where(r => r.MemberId == memberId)
            .Join(db.Events, r => r.EventId, e => e.Id, (r, e) => new { e.Id, e.SeriesId, e.Title, Ends = e.EndsAt ?? e.StartsAt, r.CreatedAt })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var enrolments = await db.SeriesEnrolments.AsNoTracking()
            .Where(x => x.MemberId == memberId)
            .Select(x => new { x.SeriesId, x.CreatedAt })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var seriesSince = places
            .Where(p => p.SeriesId is not null && p.Ends > now)
            .Select(p => (SeriesId: p.SeriesId!.Value, p.CreatedAt))
            .Concat(enrolments.Select(x => (x.SeriesId, x.CreatedAt)))
            .GroupBy(x => x.SeriesId)
            .ToDictionary(g => g.Key, g => g.Min(x => x.CreatedAt));
        var seriesIds = seriesSince.Keys.ToList();
        var titles = await db.EventSeries.AsNoTracking()
            .Where(s => seriesIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.Title, cancellationToken)
            .ConfigureAwait(false);
        return
        [
            .. places.Where(p => p.SeriesId is null).Select(p => new ChatRoom(ChatScope.OfEvent(p.Id), p.Title, p.CreatedAt)),
            .. seriesSince.Select(s => new ChatRoom(ChatScope.OfSeries(s.Key), titles[s.Key], s.Value)),
        ];
    }

    /// <summary>How many members each chat of <paramref name="scopes"/> holds.</summary>
    public static async Task<Dictionary<Guid, int>> CountsAsync(IAppDbContext db, IReadOnlyCollection<ChatScope> scopes, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var eventIds = scopes.Where(s => s.Kind == ChatScopeKind.Event).Select(s => s.Id).ToList();
        var seriesIds = scopes.Where(s => s.Kind == ChatScopeKind.Series).Select(s => s.Id).ToList();
        var counts = await db.Registrations.AsNoTracking()
            .Where(r => eventIds.Contains(r.EventId))
            .GroupBy(r => r.EventId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Key, g => g.Count, cancellationToken)
            .ConfigureAwait(false);
        var enrolled = await db.SeriesEnrolments.AsNoTracking()
            .Where(x => seriesIds.Contains(x.SeriesId))
            .Select(x => new { x.SeriesId, x.MemberId })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var dropIns = await db.Registrations.AsNoTracking()
            .Join(
                db.Events.Where(e => e.SeriesId != null && seriesIds.Contains(e.SeriesId.Value) && (e.EndsAt ?? e.StartsAt) > now),
                r => r.EventId,
                e => e.Id,
                (r, e) => new { SeriesId = e.SeriesId!.Value, r.MemberId })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        foreach (var group in enrolled.Concat(dropIns).Distinct().GroupBy(x => x.SeriesId))
        {
            counts[group.Key] = group.Count();
        }

        return counts;
    }
}
