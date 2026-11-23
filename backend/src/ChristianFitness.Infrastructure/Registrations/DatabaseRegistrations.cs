using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Profiles;
using ChristianFitness.Domain.Events;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Infrastructure.Registrations;

/// <summary>The registrations in the database (ADR 0032): who is going to what, and how many.</summary>
internal sealed class DatabaseRegistrations(AppDbContext db) : IRegistrationReader
{
    public async Task<IReadOnlyList<UpcomingEventDto>> UpcomingForAsync(Guid memberId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var events = await db.Registrations.AsNoTracking()
            .Where(r => r.MemberId == memberId)
            .Join(db.Events, r => r.EventId, e => e.Id, (_, e) => e)
            .Where(e => e.Status == EventStatus.Published && e.StartsAt > now)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return [.. events
            .OrderBy(e => e.StartsAt)
            .Select(e => new UpcomingEventDto(e.Id, e.Title, e.StartsAt, e.ImageKey is null ? null : $"/api/events/images/{e.ImageKey}"))];
    }

    public Task<int> GoingAsync(Guid eventId, CancellationToken cancellationToken) =>
        db.Registrations.CountAsync(r => r.EventId == eventId, cancellationToken);

    public async Task<IReadOnlyDictionary<Guid, int>> GoingForAsync(IReadOnlyCollection<Guid> eventIds, CancellationToken cancellationToken) =>
        await db.Registrations.AsNoTracking()
            .Where(r => eventIds.Contains(r.EventId))
            .GroupBy(r => r.EventId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Key, g => g.Count, cancellationToken)
            .ConfigureAwait(false);

    public async Task<IReadOnlyDictionary<Guid, int>> CountsForAsync(IReadOnlyCollection<Guid> memberIds, CancellationToken cancellationToken) =>
        await db.Registrations.AsNoTracking()
            .Where(r => memberIds.Contains(r.MemberId))
            .GroupBy(r => r.MemberId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Key, g => g.Count, cancellationToken)
            .ConfigureAwait(false);
}
