using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Chat;

/// <summary>The newest message of a conversation, as its row shows it.</summary>
public sealed record LastMessageDto(string Author, string Text, DateTimeOffset SentAt);

/// <summary>
/// One row of the Messages list (L2-015 AC1; ADR 0042). <see cref="Kind"/> is <c>group</c> for a
/// standalone event's chat, whose <see cref="Id"/> is the event's id, <c>series</c> for a series' one
/// chat, whose id is the series' (ADR 0099), and <c>direct</c> for a direct conversation (slice
/// 14.1), whose id is the other member's. A group or series row's <see cref="MemberCount"/> is the
/// members in its chat; a direct one has none. <see cref="ActivityAt"/> is what the list is ordered
/// by: the last message's time, or since when the member is in the chat when nothing has been said.
/// </summary>
public sealed record ConversationSummaryDto(
    string Kind,
    Guid Id,
    string Name,
    int? MemberCount,
    LastMessageDto? LastMessage,
    int UnreadCount,
    DateTimeOffset ActivityAt);

/// <summary>The conversations a member belongs to, newest first, at most <see cref="ListConversationsHandler.Window"/>.</summary>
public sealed record ConversationListDto(IReadOnlyList<ConversationSummaryDto> Conversations);

/// <summary>
/// The caller's own conversations, newest first (L2-015 AC1). A person sees only the groups they belong
/// to (ADR 0041, ADR 0099).
/// </summary>
public sealed record ListConversationsQuery : IRequest<ConversationListDto>;

internal sealed class ListConversationsHandler(IAppDbContext db, ICurrentMember current, TimeProvider time)
    : IRequestHandler<ListConversationsQuery, ConversationListDto>
{
    /// <summary>The most conversations the list returns, so what a session holds is bounded.</summary>
    public const int Window = 50;

    public async Task<ConversationListDto> Handle(ListConversationsQuery request, CancellationToken cancellationToken)
    {
        var me = current.Id;
        var now = time.GetUtcNow();
        var mine = await ChatMembership.RoomsOfAsync(db, me, now, cancellationToken).ConfigureAwait(false);
        var scopeIds = mine.Select(c => c.Scope.Id).ToList();

        var latest = await db.ChatMessages.AsNoTracking()
            .Where(m => scopeIds.Contains(m.ScopeId))
            .GroupBy(m => m.ScopeId)
            .Select(g => new { ScopeId = g.Key, SentAt = g.Max(m => m.SentAt) })
            .ToDictionaryAsync(g => g.ScopeId, g => g.SentAt, cancellationToken)
            .ConfigureAwait(false);

        var window = mine
            .Select(c => new { c.Scope, c.Title, ActivityAt = latest.TryGetValue(c.Scope.Id, out var sentAt) ? sentAt : c.Since })
            .OrderByDescending(c => c.ActivityAt).ThenBy(c => c.Scope.Id)
            .Take(Window)
            .ToList();
        var shown = window.Select(c => c.Scope.Id).ToList();

        var lastMessages = await db.ChatMessages.AsNoTracking()
            .Where(m => shown.Contains(m.ScopeId))
            .Join(
                db.ChatMessages.AsNoTracking().Where(m => shown.Contains(m.ScopeId)).GroupBy(m => m.ScopeId)
                    .Select(g => new { ScopeId = g.Key, SentAt = g.Max(m => m.SentAt) }),
                m => new { m.ScopeId, m.SentAt },
                g => new { g.ScopeId, g.SentAt },
                (m, _) => m)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var newest = lastMessages
            .GroupBy(m => m.ScopeId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(m => m.Id).First());
        var authorIds = newest.Values.Select(m => m.AuthorId).Distinct().ToList();
        var names = await db.Members.AsNoTracking()
            .Where(m => authorIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, m => m.Name, cancellationToken)
            .ConfigureAwait(false);

        var unread = await (
            from m in db.ChatMessages.AsNoTracking()
            where m.AuthorId != me && shown.Contains(m.ScopeId)
            join k in db.ChatReadMarkers.AsNoTracking().Where(k => k.MemberId == me) on m.ScopeId equals k.ScopeId into markers
            from k in markers.DefaultIfEmpty()
            where k == null || m.SentAt > k.ReadAt
            group m by m.ScopeId into g
            select new { ScopeId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.ScopeId, g => g.Count, cancellationToken)
            .ConfigureAwait(false);

        var members = await ChatMembership.CountsAsync(db, [.. window.Select(c => c.Scope)], now, cancellationToken).ConfigureAwait(false);

        var rows = window.Select(c => new ConversationSummaryDto(
            c.Scope.Kind == ChatScopeKind.Series ? "series" : "group",
            c.Scope.Id,
            c.Title,
            members.GetValueOrDefault(c.Scope.Id),
            newest.TryGetValue(c.Scope.Id, out var message) ? new LastMessageDto(names[message.AuthorId], message.Text, message.SentAt) : null,
            unread.GetValueOrDefault(c.Scope.Id),
            c.ActivityAt)).ToList();
        var direct = await DirectRowsAsync(me, cancellationToken).ConfigureAwait(false);
        return new ConversationListDto([.. rows.Concat(direct).OrderByDescending(r => r.ActivityAt).ThenBy(r => r.Id).Take(Window)]);
    }

    /// <summary>
    /// The caller's direct conversations, newest first, at most <see cref="Window"/> (slice 14.1; ADR 0043):
    /// one row per member they have exchanged a message with, named for that member, with no member count.
    /// </summary>
    private async Task<List<ConversationSummaryDto>> DirectRowsAsync(Guid me, CancellationToken cancellationToken)
    {
        var partners = (await db.DirectMessages.AsNoTracking()
                .Where(m => m.SenderId == me || m.RecipientId == me)
                .Select(m => new { Partner = m.SenderId == me ? m.RecipientId : m.SenderId, m.SentAt })
                .GroupBy(m => m.Partner)
                .Select(g => new { Partner = g.Key, SentAt = g.Max(m => m.SentAt) })
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false))
            .OrderByDescending(p => p.SentAt).ThenBy(p => p.Partner)
            .Take(Window)
            .ToList();
        var ids = partners.Select(p => p.Partner).ToList();
        var names = await db.Members.AsNoTracking()
            .Where(m => ids.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, m => m.Name, cancellationToken)
            .ConfigureAwait(false);
        var unread = await (
            from m in db.DirectMessages.AsNoTracking()
            where m.RecipientId == me && ids.Contains(m.SenderId)
            join k in db.ChatReadMarkers.AsNoTracking().Where(k => k.MemberId == me) on m.SenderId equals k.ScopeId into markers
            from k in markers.DefaultIfEmpty()
            where k == null || m.SentAt > k.ReadAt
            group m by m.SenderId into g
            select new { Partner = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Partner, g => g.Count, cancellationToken)
            .ConfigureAwait(false);

        var rows = new List<ConversationSummaryDto>(partners.Count);
        foreach (var partner in partners)
        {
            var other = partner.Partner;
            var last = await db.DirectMessages.AsNoTracking()
                .Where(m => (m.SenderId == me && m.RecipientId == other) || (m.SenderId == other && m.RecipientId == me))
                .OrderByDescending(m => m.SentAt).ThenByDescending(m => m.Id)
                .FirstAsync(cancellationToken)
                .ConfigureAwait(false);
            var author = last.SenderId == me ? "You" : names.GetValueOrDefault(other, string.Empty);
            rows.Add(new ConversationSummaryDto(
                "direct",
                other,
                names.GetValueOrDefault(other, string.Empty),
                null,
                new LastMessageDto(author, last.Text, last.SentAt),
                unread.GetValueOrDefault(other),
                partner.SentAt));
        }

        return rows;
    }
}
