using ChristianFitness.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Chat;

/// <summary>The newest message of a conversation, as its row shows it.</summary>
public sealed record LastMessageDto(string Author, string Text, DateTimeOffset SentAt);

/// <summary>
/// One row of the Messages list (L2-015 AC1; ADR 0042). <see cref="Kind"/> is <c>group</c> for an event's
/// chat, whose <see cref="Id"/> is the event's id and whose <see cref="MemberCount"/> is the members
/// registered; a direct conversation (slice 14.1) will be <c>direct</c>, with no member count.
/// <see cref="ActivityAt"/> is what the list is ordered by: the last message's time, or the member's
/// registration when nothing has been said.
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
/// to: today a registration is the membership (ADR 0041).
/// </summary>
public sealed record ListConversationsQuery : IRequest<ConversationListDto>;

internal sealed class ListConversationsHandler(IAppDbContext db, ICurrentMember current)
    : IRequestHandler<ListConversationsQuery, ConversationListDto>
{
    /// <summary>The most conversations the list returns, so what a session holds is bounded.</summary>
    public const int Window = 50;

    public async Task<ConversationListDto> Handle(ListConversationsQuery request, CancellationToken cancellationToken)
    {
        var me = current.Id;
        var mine = await db.Registrations.AsNoTracking()
            .Where(r => r.MemberId == me)
            .Join(db.Events, r => r.EventId, e => e.Id, (r, e) => new { e.Id, e.Title, r.CreatedAt })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var eventIds = mine.Select(c => c.Id).ToList();

        var latest = await db.ChatMessages.AsNoTracking()
            .Where(m => eventIds.Contains(m.EventId))
            .GroupBy(m => m.EventId)
            .Select(g => new { EventId = g.Key, SentAt = g.Max(m => m.SentAt) })
            .ToDictionaryAsync(g => g.EventId, g => g.SentAt, cancellationToken)
            .ConfigureAwait(false);

        var window = mine
            .Select(c => new { c.Id, c.Title, ActivityAt = latest.TryGetValue(c.Id, out var sentAt) ? sentAt : c.CreatedAt })
            .OrderByDescending(c => c.ActivityAt).ThenBy(c => c.Id)
            .Take(Window)
            .ToList();
        var shown = window.Select(c => c.Id).ToList();

        var lastMessages = await db.ChatMessages.AsNoTracking()
            .Where(m => shown.Contains(m.EventId))
            .Join(
                db.ChatMessages.AsNoTracking().Where(m => shown.Contains(m.EventId)).GroupBy(m => m.EventId)
                    .Select(g => new { EventId = g.Key, SentAt = g.Max(m => m.SentAt) }),
                m => new { m.EventId, m.SentAt },
                g => new { g.EventId, g.SentAt },
                (m, _) => m)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var newest = lastMessages
            .GroupBy(m => m.EventId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(m => m.Id).First());
        var authorIds = newest.Values.Select(m => m.AuthorId).Distinct().ToList();
        var names = await db.Members.AsNoTracking()
            .Where(m => authorIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, m => m.Name, cancellationToken)
            .ConfigureAwait(false);

        var unread = await (
            from m in db.ChatMessages.AsNoTracking()
            where m.AuthorId != me && shown.Contains(m.EventId)
            join k in db.ChatReadMarkers.AsNoTracking().Where(k => k.MemberId == me) on m.EventId equals k.EventId into markers
            from k in markers.DefaultIfEmpty()
            where k == null || m.SentAt > k.ReadAt
            group m by m.EventId into g
            select new { EventId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.EventId, g => g.Count, cancellationToken)
            .ConfigureAwait(false);

        var members = await db.Registrations.AsNoTracking()
            .Where(r => shown.Contains(r.EventId))
            .GroupBy(r => r.EventId)
            .Select(g => new { EventId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.EventId, g => g.Count, cancellationToken)
            .ConfigureAwait(false);

        var rows = window.Select(c => new ConversationSummaryDto(
            "group",
            c.Id,
            c.Title,
            members.GetValueOrDefault(c.Id),
            newest.TryGetValue(c.Id, out var message) ? new LastMessageDto(names[message.AuthorId], message.Text, message.SentAt) : null,
            unread.GetValueOrDefault(c.Id),
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
            join k in db.ChatReadMarkers.AsNoTracking().Where(k => k.MemberId == me) on m.SenderId equals k.EventId into markers
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
