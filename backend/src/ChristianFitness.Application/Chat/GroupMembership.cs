using ChristianFitness.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Chat;

/// <summary>
/// Whether two members share a group chat (L2-065 AC11; ADR 0075): both still hold a place at one
/// event that has its own chat, whether it is to come, past or cancelled, or both are in one series'
/// chat. Leaving a chat ends it for the pair. Profile visibility and messaging both ask this.
/// </summary>
internal static class GroupMembership
{
    public static async Task<bool> ShareAGroupAsync(IAppDbContext db, Guid a, Guid b, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (a == b)
        {
            return true;
        }

        var mine = db.Registrations.AsNoTracking().Where(r => r.MemberId == a).Select(r => r.EventId);
        var sharedEvent = await db.Registrations.AsNoTracking()
            .Where(r => r.MemberId == b && mine.Contains(r.EventId))
            .Join(db.Events.Where(e => e.SeriesId == null), r => r.EventId, e => e.Id, (r, _) => r.Id)
            .AnyAsync(cancellationToken).ConfigureAwait(false);
        if (sharedEvent)
        {
            return true;
        }

        var roomsOfA = await ChatMembership.RoomsOfAsync(db, a, now, cancellationToken).ConfigureAwait(false);
        foreach (var room in roomsOfA.Where(r => r.Scope.Kind == Domain.Events.ChatScopeKind.Series))
        {
            if (await ChatMembership.InSeriesAsync(db, room.Scope.Id, b, now, cancellationToken).ConfigureAwait(false))
            {
                return true;
            }
        }

        return false;
    }
}
