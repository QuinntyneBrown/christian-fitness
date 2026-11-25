using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Directory;

/// <summary>
/// A published listing's profile (L2-055 AC1; ADR 0085): what it publishes, its follower count and
/// the year it was listed, in Toronto. The website is served as stored; the app shows only an
/// https address (L2-055 AC5). It carries no member id, contact detail or owner's name.
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
    int ListedYear);

/// <summary>Opens one listing's profile; anything but a published listing is 404 <c>listing_not_found</c> (L2-055 AC7).</summary>
public sealed record GetListingProfileQuery(Guid Id) : IRequest<ListingProfileDto>;

internal sealed class GetListingProfileHandler(IAppDbContext db) : IRequestHandler<GetListingProfileQuery, ListingProfileDto>
{
    public async Task<ListingProfileDto> Handle(GetListingProfileQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var listing = await db.DirectoryListings.AsNoTracking()
            .SingleOrDefaultAsync(l => l.Id == request.Id && l.Status == ListingStatus.Published, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.ListingNotFound, RefusalKind.NotFound);

        // Following arrives with journey 8; until then nobody follows a listing (ADR 0085).
        const int followers = 0;
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
            EventSchedule.TorontoOf(listing.ListedAt).Date.Year);
    }
}
