using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>What Home shows of events: the member's next one and the ones that may suit them (L2-007 AC1, AC2; ADR 0044).</summary>
public sealed record HomeDto(EventSummaryDto? NextEvent, IReadOnlyList<EventSummaryDto> Suggested);

/// <summary>The signed-in member's Home; the session, never the request, says whose.</summary>
public sealed record GetHomeQuery : IRequest<HomeDto>
{
    /// <summary>The most events Home suggests.</summary>
    public const int MaxSuggested = 3;
}

/// <summary>
/// Reads the earliest published event the member is going to that has not started, and the three
/// soonest published upcoming events of the categories their interests name that they are not going
/// to. Both are bounded queries; the going counts of the at most four events come in one question.
/// </summary>
internal sealed class GetHomeHandler(IAppDbContext db, ICurrentMember current, IRegistrationReader registrations, TimeProvider time)
    : IRequestHandler<GetHomeQuery, HomeDto>
{
    public async Task<HomeDto> Handle(GetHomeQuery request, CancellationToken cancellationToken)
    {
        var memberId = current.Id;
        var now = time.GetUtcNow();
        var interests = await db.Members.AsNoTracking()
            .Where(m => m.Id == memberId)
            .Select(m => m.Interests)
            .SingleAsync(cancellationToken)
            .ConfigureAwait(false);
        var categories = InterestCategories.For(interests);

        var mine = db.Registrations.AsNoTracking().Where(r => r.MemberId == memberId).Select(r => r.EventId);
        var upcoming = db.Events.AsNoTracking().Where(e => e.Status == EventStatus.Published && e.StartsAt > now);
        var next = await upcoming
            .Where(e => mine.Contains(e.Id))
            .OrderBy(e => e.StartsAt).ThenBy(e => e.Id)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);
        var suggested = await upcoming
            .Where(e => categories.Contains(e.Category) && !mine.Contains(e.Id))
            .OrderBy(e => e.StartsAt).ThenBy(e => e.Id)
            .Take(GetHomeQuery.MaxSuggested)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var shown = suggested.Concat(next is null ? [] : [next]).ToList();
        var going = await registrations.GoingForAsync([.. shown.Select(e => e.Id)], cancellationToken).ConfigureAwait(false);
        EventSummaryDto Summary(Event e) => new(
            e.Id, e.Title, EventNames.Of(e.Category), e.StartsAt, e.Place, e.Area, e.PriceCents, e.Capacity,
            going.GetValueOrDefault(e.Id), e.ImageKey);
        return new HomeDto(next is null ? null : Summary(next), [.. suggested.Select(Summary)]);
    }
}
