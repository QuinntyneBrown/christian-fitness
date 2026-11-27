using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Chat;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>
/// What Home shows (L2-007 AC1, AC2; ADR 0044, ADR 0045): the member's next event, up to three
/// events that suit their interests, and their unread message count.
/// </summary>
public sealed record HomeDto(EventSummaryDto? NextEvent, IReadOnlyList<EventSummaryDto> Suggested, int UnreadCount);

/// <summary>The signed-in member's Home; the session, never the request, says whose.</summary>
public sealed record GetHomeQuery : IRequest<HomeDto>
{
    /// <summary>The most events Home suggests.</summary>
    public const int MaxSuggested = 3;

    /// <summary>The soonest events ranked for suggestions: enough to order, bounded so Home stays cheap.</summary>
    public const int CandidateLimit = 200;
}

/// <summary>
/// Reads the earliest published event the member is going to that has not started, the three
/// soonest published upcoming events of the categories their interests name that they are not going
/// to, and the unread message count across their group chats (ADR 0101) and direct conversations.
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
        // Every published event to come that the member is not going to is a candidate; the rule of
        // ADR 0076 orders them and the first three are suggested (L2-065 AC7).
        var candidates = await upcoming
            .Where(e => !mine.Contains(e.Id))
            .OrderBy(e => e.StartsAt).ThenBy(e => e.Id)
            .Take(GetHomeQuery.CandidateLimit)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var area = await db.MemberPreferences.AsNoTracking().Where(p => p.MemberId == memberId).Select(p => p.Area)
            .SingleOrDefaultAsync(cancellationToken).ConfigureAwait(false);
        var followed = await db.ListingFollows.AsNoTracking().Where(f => f.MemberId == memberId).Select(f => f.ListingId)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        var byId = candidates.ToDictionary(e => e.Id);
        var suggested = HomeSuggestions
            .Rank(candidates.Select(e => new HomeSuggestions.Candidate(e.Id, e.Title, e.StartsAt, e.SuggestionArea, e.HostListingId, e.Category)), area, followed, categories)
            .Take(GetHomeQuery.MaxSuggested)
            .Select(c => byId[c.Id])
            .ToList();

        // The group chats the member is in: standalone events' and series' (ADR 0101).
        var chats = (await ChatMembership.RoomsOfAsync(db, memberId, now, cancellationToken).ConfigureAwait(false))
            .Select(c => c.Scope.Id)
            .ToList();
        var groupUnread = await (
            from m in db.ChatMessages.AsNoTracking()
            where m.AuthorId != memberId && chats.Contains(m.ScopeId)
            join k in db.ChatReadMarkers.AsNoTracking().Where(k => k.MemberId == memberId) on m.ScopeId equals k.ScopeId into markers
            from k in markers.DefaultIfEmpty()
            where k == null || m.SentAt > k.ReadAt
            select m.Id)
            .CountAsync(cancellationToken)
            .ConfigureAwait(false);

        var directUnread = await (
            from m in db.DirectMessages.AsNoTracking()
            where m.RecipientId == memberId
            join k in db.ChatReadMarkers.AsNoTracking().Where(k => k.MemberId == memberId) on m.SenderId equals k.ScopeId into markers
            from k in markers.DefaultIfEmpty()
            where k == null || m.SentAt > k.ReadAt
            select m.Id)
            .CountAsync(cancellationToken)
            .ConfigureAwait(false);

        var shown = suggested.Concat(next is null ? [] : [next]).ToList();
        var going = await registrations.GoingForAsync([.. shown.Select(e => e.Id)], cancellationToken).ConfigureAwait(false);
        EventSummaryDto Summary(Event e) => new(
            e.Id, e.Title, EventNames.Of(e.Category), e.StartsAt, e.Place, e.Area, e.PriceCents, e.Capacity,
            going.GetValueOrDefault(e.Id), e.ImageKey);
        return new HomeDto(next is null ? null : Summary(next), [.. suggested.Select(Summary)], groupUnread + directUnread);
    }
}
