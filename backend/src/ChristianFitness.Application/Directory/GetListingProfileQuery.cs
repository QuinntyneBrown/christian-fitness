using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Directory;

/// <summary>
/// One event the listing hosts that is still to come (L2-055 AC2): the app words its category, date,
/// time and place in Toronto and leads to the event.
/// </summary>
public sealed record HostedEventDto(Guid Id, string Title, string Category, DateTimeOffset StartsAt, string Place, string? ImageKey);

/// <summary>
/// A published listing this one is connected to (L2-055 AC4), with the relation worded from this
/// listing's side; the app shows its mark, name, relation and kind and leads to its profile.
/// </summary>
public sealed record ListingConnectionDto(Guid Id, string Kind, string Name, string? PhotoKey, string Relation);

/// <summary>
/// A published listing's profile (L2-055 AC1 to AC5; ADR 0087): what it publishes, its follower count and
/// the year it was listed, in Toronto. The website is served as stored; the app shows only an
/// https address (L2-055 AC5). <c>HasOwner</c> says whether Message can reach anyone (L2-055 AC6);
/// <c>ServiceListingId</c> names the Services listing of the same owner, or that staff linked, for
/// "Also offers services" (ADR 0061). <c>Following</c> says whether the signed-in caller follows it,
/// <c>false</c> for an anonymous caller (ADR 0088). <c>IsOwner</c> says the signed-in caller owns it,
/// and only then is <c>Owner</c> given, with what the owner's editor opens on (ADR 0093). It carries
/// no member id or owner's name, and a contact detail only in <c>Owner</c>.
/// </summary>
public sealed record ListingProfileDto(
    Guid Id,
    string Kind,
    string Name,
    string Tagline,
    string Area,
    string Description,
    IReadOnlyList<string> Focus,
    string? WebsiteUrl,
    bool IsVerified,
    string? PhotoKey,
    int Followers,
    int ListedYear,
    bool HasOwner,
    int HostingCount,
    IReadOnlyList<HostedEventDto> Hosting,
    IReadOnlyList<ListingConnectionDto> Connections,
    Guid? ServiceListingId,
    bool Following,
    bool IsOwner,
    OwnListingDto? Owner);

/// <summary>
/// What only the owner reads of their listing (L2-079 AC2; ADR 0093): its contact email, and the
/// name and kind waiting for staff, by ADR 0082's kind slug.
/// </summary>
public sealed record OwnListingDto(string? ContactEmail, string? PendingName, string? PendingKind);

/// <summary>Opens one listing's profile; anything but a published listing is 404 <c>listing_not_found</c> (L2-055 AC7).</summary>
public sealed record GetListingProfileQuery(Guid Id) : IRequest<ListingProfileDto>
{
    /// <summary>The most hosting rows a profile shows; the count covers them all (ADR 0087).</summary>
    public const int HostingLimit = 20;
}

internal sealed class GetListingProfileHandler(IAppDbContext db, ICurrentMember current, TimeProvider time) : IRequestHandler<GetListingProfileQuery, ListingProfileDto>
{
    public async Task<ListingProfileDto> Handle(GetListingProfileQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var listing = await db.DirectoryListings.AsNoTracking()
            .SingleOrDefaultAsync(l => l.Id == request.Id && l.Status == ListingStatus.Published, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.ListingNotFound, RefusalKind.NotFound);
        return await ListingProfile.OfAsync(db, current.SignedInId, time.GetUtcNow(), listing, cancellationToken).ConfigureAwait(false);
    }
}

/// <summary>A published listing's profile as <paramref name="caller"/> reads it, shared by the read and the owner's save.</summary>
internal static class ListingProfile
{
    public static async Task<ListingProfileDto> OfAsync(IAppDbContext db, Guid? caller, DateTimeOffset now, DirectoryListing listing, CancellationToken cancellationToken)
    {
        // The published one-off events it hosts that have not started (the directory row's rule, ADR 0082);
        // series join first with journey 11.
        var hosted = db.Events.AsNoTracking()
            .Where(e => e.HostListingId == listing.Id && e.Status == EventStatus.Published && e.StartsAt > now);
        var hostingCount = await hosted.CountAsync(cancellationToken).ConfigureAwait(false);
        var hosting = (await hosted
                .OrderBy(e => e.StartsAt)
                .ThenBy(e => e.Id)
                .Take(GetListingProfileQuery.HostingLimit)
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false))
            .Select(e => new HostedEventDto(e.Id, e.Title, EventNames.Of(e.Category), e.StartsAt, e.Place, e.ImageKey))
            .ToList();

        // Its connections to listings members can open, in the directory's order: kind, then folded name.
        var connections = (await (
                from c in db.ListingConnections.AsNoTracking()
                join other in db.DirectoryListings.AsNoTracking() on c.ConnectedListingId equals other.Id
                where c.ListingId == listing.Id && other.Status == ListingStatus.Published
                orderby other.KindOrder, other.NameKey, other.Id
                select new { other.Id, other.Kind, other.Name, other.PhotoKey, c.Relation })
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false))
            .Select(c => new ListingConnectionDto(c.Id, ListingKinds.SlugOf(c.Kind), c.Name, c.PhotoKey, c.Relation))
            .ToList();

        // The Services listing of the same member, or the one staff linked, while it exists (ADR 0061, ADR 0087).
        var ownerId = listing.MemberId;
        var linkedId = listing.ServiceListingId;
        var serviceListingId = ownerId is null && linkedId is null
            ? null
            : await db.ServiceListings.AsNoTracking()
                .Where(s => (ownerId != null && s.MemberId == ownerId) || (linkedId != null && s.Id == linkedId))
                .OrderBy(s => s.PublishedAt)
                .ThenBy(s => s.Id)
                .Select(s => (Guid?)s.Id)
                .FirstOrDefaultAsync(cancellationToken)
                .ConfigureAwait(false);

        // Only the count of who follows it, and whether the caller does (L2-056 AC6; ADR 0088).
        var followers = await ListingFollows.CountAsync(db, listing.Id, cancellationToken).ConfigureAwait(false);
        var following = caller is { } memberId
            && await ListingFollows.FollowsAsync(db, memberId, listing.Id, cancellationToken).ConfigureAwait(false);
        var isOwner = caller is not null && listing.MemberId == caller;
        return new ListingProfileDto(
            listing.Id,
            ListingKinds.SlugOf(listing.Kind),
            listing.Name,
            listing.Tagline,
            listing.Area,
            listing.Description,
            listing.Focus,
            listing.WebsiteUrl,
            listing.IsVerified,
            listing.PhotoKey,
            followers,
            EventSchedule.TorontoOf(listing.ListedAt).Date.Year,
            listing.MemberId is not null,
            hostingCount,
            hosting,
            connections,
            serviceListingId,
            following,
            isOwner,
            isOwner ? new OwnListingDto(
                listing.ContactEmail,
                listing.PendingName,
                listing.PendingKind is { } kind ? ListingKinds.SlugOf(kind) : null) : null);
    }
}
