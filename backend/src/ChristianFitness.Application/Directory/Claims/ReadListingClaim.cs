using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Directory;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Directory.Claims;

/// <summary>
/// The listing as it will appear once published (L2-078 AC5; ADR 0091): what a draft from a
/// suggestion has, which may be no tagline, about or focus tags yet. Words are plain text.
/// </summary>
public sealed record ClaimPreviewDto(
    string Kind,
    string Name,
    string Tagline,
    string Area,
    string About,
    IReadOnlyList<string> Focus,
    string? Website,
    bool IsVerified,
    string? PhotoKey);

/// <summary>
/// What a claim link answers (ADR 0091): the listing's name and when the link expires to anyone, and
/// <see cref="Listing"/> only to a signed-in caller (L2-078 AC4, AC5).
/// </summary>
public sealed record ListingClaimDto(string Name, DateTimeOffset ExpiresAt, ClaimPreviewDto? Listing);

/// <summary>Reads the claim link with <see cref="Token"/>; an unknown one is 404 <c>claim_not_found</c>.</summary>
public sealed record GetListingClaimQuery(string Token) : IRequest<ListingClaimDto>;

internal sealed class GetListingClaimHandler(IAppDbContext db, ICurrentMember current, TimeProvider time)
    : IRequestHandler<GetListingClaimQuery, ListingClaimDto>
{
    public async Task<ListingClaimDto> Handle(GetListingClaimQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (claim, listing) = await ListingClaims.OpenAsync(db, request.Token, time.GetUtcNow(), tracked: false, cancellationToken).ConfigureAwait(false);
        var preview = current.SignedInId is null
            ? null
            : new ClaimPreviewDto(
                ListingKinds.SlugOf(listing.Kind),
                listing.Name,
                listing.Tagline,
                listing.Area,
                listing.Description,
                listing.Focus,
                listing.WebsiteUrl,
                listing.IsVerified,
                listing.PhotoKey);
        return new ListingClaimDto(listing.Name, claim.ExpiresAt, preview);
    }
}

/// <summary>How the claim handlers find a link that can still be answered (ADR 0091).</summary>
internal static class ListingClaims
{
    /// <summary>The audit record type of what a claim changes: the listing.</summary>
    public const string RecordType = "DirectoryListing";

    /// <summary>
    /// The open claim with <paramref name="token"/> and its listing. Unknown is 404 <c>claim_not_found</c>;
    /// a used link, or one whose listing is no longer a draft, 409 <c>claim_link_used</c>; an expired one
    /// 410 <c>claim_link_expired</c>. They are checked in that order (ADR 0091).
    /// </summary>
    public static async Task<(ListingClaim Claim, DirectoryListing Listing)> OpenAsync(
        IAppDbContext db, string token, DateTimeOffset now, bool tracked, CancellationToken cancellationToken)
    {
        var hash = ListingClaim.HashOf(token);
        var claims = tracked ? db.ListingClaims : db.ListingClaims.AsNoTracking();
        var listings = tracked ? db.DirectoryListings : db.DirectoryListings.AsNoTracking();
        var claim = await claims.SingleOrDefaultAsync(c => c.TokenHash == hash, cancellationToken).ConfigureAwait(false);
        var listing = claim is null
            ? null
            : await listings.SingleOrDefaultAsync(l => l.Id == claim.ListingId, cancellationToken).ConfigureAwait(false);
        if (claim is null || listing is null)
        {
            throw new RefusalException(RefusalCodes.ClaimNotFound, RefusalKind.NotFound);
        }

        var state = claim.StateAt(now);
        if (state == ClaimLinkState.Used || listing.Status != ListingStatus.Draft)
        {
            throw new RefusalException(RefusalCodes.ClaimLinkUsed, RefusalKind.Conflict);
        }

        if (state == ClaimLinkState.Expired)
        {
            throw new RefusalException(RefusalCodes.ClaimLinkExpired, RefusalKind.Gone);
        }

        return (claim, listing);
    }
}
