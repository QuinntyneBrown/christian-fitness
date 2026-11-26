using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Email;
using ChristianFitness.Application.Events;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.CommunityPicks;

/// <summary>
/// The events Community Pick offers (L2-072 AC1, AC13; ADR 0098): the published events whose start
/// is after now, soonest first, at most <see cref="Limit"/>, with the member app's public address
/// the captions link to.
/// </summary>
public sealed record ListPickableEventsQuery : IRequest<PickableEventListDto>
{
    /// <summary>The most events one answer holds; more than a hundred to come is not yet in sight.</summary>
    public const int Limit = 100;
}

/// <summary>The list, and the origin every caption's <c>/e/&lt;id&gt;</c> link starts with.</summary>
public sealed record PickableEventListDto(string SiteOrigin, IReadOnlyList<PickableEventDto> Events);

/// <summary>
/// One event as the graphics and captions need it: its category (for the list's fallback photo),
/// start, place, area, price in cents, places left (never below 0), image key and latest pick.
/// </summary>
public sealed record PickableEventDto(
    Guid Id,
    string Title,
    string Category,
    DateTimeOffset StartsAt,
    string Place,
    string Area,
    int PriceCents,
    int SpotsLeft,
    string? ImageKey,
    DateTimeOffset? LastPickedAt);

internal sealed class ListPickableEventsHandler(IAppDbContext db, TimeProvider time, IRegistrationReader registrations, MemberAppAddress app)
    : IRequestHandler<ListPickableEventsQuery, PickableEventListDto>
{
    public async Task<PickableEventListDto> Handle(ListPickableEventsQuery request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var events = await db.Events.AsNoTracking()
            .Where(e => e.Status == EventStatus.Published && e.StartsAt > now)
            .OrderBy(e => e.StartsAt)
            .ThenBy(e => e.Id)
            .Take(ListPickableEventsQuery.Limit)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var ids = events.Select(e => e.Id).ToList();
        var going = await registrations.GoingForAsync(ids, cancellationToken).ConfigureAwait(false);
        var picked = await db.CommunityPicks.AsNoTracking()
            .Where(p => ids.Contains(p.EventId))
            .GroupBy(p => p.EventId)
            .Select(g => new { g.Key, Latest = g.Max(p => p.PickedAt) })
            .ToDictionaryAsync(g => g.Key, g => g.Latest, cancellationToken)
            .ConfigureAwait(false);

        var rows = events.Select(e => new PickableEventDto(
            e.Id,
            e.Title,
            EventNames.Of(e.Category),
            e.StartsAt,
            e.Place,
            e.Area,
            e.PriceCents,
            Math.Max(e.Capacity - going.GetValueOrDefault(e.Id), 0),
            e.ImageKey,
            picked.TryGetValue(e.Id, out var latest) ? latest : null));
        return new PickableEventListDto(SiteOriginOf(app), [.. rows]);
    }

    /// <summary>The member app's address without a trailing slash, as the captions put <c>/e/&lt;id&gt;</c> after it.</summary>
    private static string SiteOriginOf(MemberAppAddress app) =>
        $"{app.BaseUrl.GetLeftPart(UriPartial.Authority)}{app.BaseUrl.AbsolutePath.TrimEnd('/')}";
}
