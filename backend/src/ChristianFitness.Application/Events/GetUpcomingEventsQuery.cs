using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>
/// An event as the public landing page shows it (L2-001 AC5; ADR 0105): its place and its area, the
/// neighbourhood and city staff wrote under the place, as the member's list reads it; nothing about
/// who is going or who made it.
/// </summary>
public sealed record LandingEventDto(Guid Id, string Title, string Category, DateTimeOffset StartsAt, string Place, string Area);

/// <summary>The next published events that have not started, soonest first, at most <see cref="MaxTake"/> (L2-001 AC5, AC6).</summary>
public sealed record GetUpcomingEventsQuery(int Take) : IRequest<IReadOnlyList<LandingEventDto>>
{
    public const int MaxTake = 4;
}

internal sealed class GetUpcomingEventsHandler(IAppDbContext db, TimeProvider time)
    : IRequestHandler<GetUpcomingEventsQuery, IReadOnlyList<LandingEventDto>>
{
    public async Task<IReadOnlyList<LandingEventDto>> Handle(GetUpcomingEventsQuery request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var take = Math.Clamp(request.Take, 0, GetUpcomingEventsQuery.MaxTake);
        var found = await db.Events.AsNoTracking()
            .Where(e => e.Status == EventStatus.Published && e.StartsAt > now)
            .OrderBy(e => e.StartsAt)
            .ThenBy(e => e.Id)
            .Take(take)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return [.. found.Select(e => new LandingEventDto(e.Id, e.Title, EventNames.Of(e.Category), e.StartsAt, e.Place, e.Area))];
    }
}
