using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using MediatR;

namespace ChristianFitness.Application.Directory.Claims;

/// <summary>What publishing or declining a claim answers: the listing the link was for (ADR 0091).</summary>
public sealed record ClaimAnswerDto(Guid ListingId);

/// <summary>
/// The signed-in member publishes the listing behind the link with <see cref="Token"/> as theirs
/// (L2-078 AC6). Audited <c>listing.claimed</c>.
/// </summary>
public sealed record PublishListingClaimCommand(string Token) : IRequest<ClaimAnswerDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "listing.claimed";
}

/// <summary>
/// In one unit of work the draft becomes Published and owned by the claimer, the link is spent and the
/// entry is audited. Refusals are <see cref="ListingClaims.OpenAsync"/>'s. Logs nothing (L2-078 AC11).
/// </summary>
internal sealed class PublishListingClaimHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit, TimeProvider time)
    : IRequestHandler<PublishListingClaimCommand, ClaimAnswerDto>
{
    public async Task<ClaimAnswerDto> Handle(PublishListingClaimCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var now = time.GetUtcNow();
        var (claim, listing) = await ListingClaims.OpenAsync(db, request.Token, now, tracked: true, cancellationToken).ConfigureAwait(false);
        listing.Claim(current.Id, now);
        claim.Spend(now);
        audit.Record(current.Id, ListingClaims.RecordType, listing.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new ClaimAnswerDto(listing.Id);
    }
}
