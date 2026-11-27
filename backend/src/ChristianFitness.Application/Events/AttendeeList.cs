using ChristianFitness.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>
/// Who an event names among the members going (L2-065 AC4; ADR 0116): up to <see cref="Max"/>, in
/// the order they took their places, leaving out every member who switched "Show me on attendee
/// lists" off. They are still counted in going. Every list that names attendees to other members
/// reads them here, so the rule holds in one place; staff's registrations list does not.
/// </summary>
public static class AttendeeList
{
    /// <summary>The most names an event gives: an avatar stack shows at most five.</summary>
    public const int Max = 5;

    public static async Task<IReadOnlyList<string>> NamesAsync(IAppDbContext db, Guid eventId, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);
        var hidden = db.MemberPreferences.Where(p => !p.ShowOnAttendeeLists).Select(p => p.MemberId);
        return await db.Registrations.AsNoTracking()
            .Where(r => r.EventId == eventId && !hidden.Contains(r.MemberId))
            .OrderBy(r => r.CreatedAt).ThenBy(r => r.Id)
            .Join(db.Members, r => r.MemberId, m => m.Id, (_, m) => m.Name)
            .Take(Max)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
    }
}
