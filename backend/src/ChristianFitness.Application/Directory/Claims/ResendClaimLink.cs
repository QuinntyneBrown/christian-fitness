using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Chat;
using ChristianFitness.Application.Directory.Review;
using ChristianFitness.Application.Email;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Services;
using ChristianFitness.Domain.Directory;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Directory.Claims;

/// <summary>
/// Staff send a new claim link for the approved suggestion <see cref="SuggestionId"/> (L2-078 AC8;
/// ADR 0092). Audited <c>listing.claim_link_resent</c> against the listing.
/// </summary>
public sealed record ResendClaimLinkCommand(Guid SuggestionId) : IRequest, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "listing.claim_link_resent";
}

/// <summary>
/// In one unit of work every open link of the suggestion's listing is voided and a new one issued;
/// it goes out by the channel approval used, the email after the save. A suggestion that is not
/// approved, whose listing is no longer a draft or that has nobody to send to is 409
/// <c>claim_closed</c>; an unknown one 404 <c>suggestion_not_found</c>. Logs nothing (L2-078 AC11).
/// </summary>
internal sealed class ResendClaimLinkHandler(
    IAppDbContext db,
    ICurrentMember current,
    AuditTrail audit,
    SystemMessages messages,
    IEmailSender email,
    MemberAppAddress app,
    TimeProvider time)
    : IRequestHandler<ResendClaimLinkCommand>
{
    public async Task Handle(ResendClaimLinkCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var suggestion = await SuggestionReview.FindAsync(db, request.SuggestionId, cancellationToken).ConfigureAwait(false);
        var listing = suggestion.Status == SuggestionStatus.Approved && suggestion.ListingId is Guid listingId
            ? await db.DirectoryListings.AsNoTracking().SingleOrDefaultAsync(l => l.Id == listingId, cancellationToken).ConfigureAwait(false)
            : null;
        if (listing is null || listing.Status != ListingStatus.Draft || ClaimLinkDelivery.ChannelOf(suggestion) is null)
        {
            throw new RefusalException(RefusalCodes.ClaimClosed, RefusalKind.Conflict);
        }

        var now = time.GetUtcNow();
        var open = await db.ListingClaims.Where(c => c.ListingId == listing.Id && c.UsedAt == null && c.VoidedAt == null).ToListAsync(cancellationToken).ConfigureAwait(false);
        foreach (var claim in open)
        {
            claim.Void(now);
        }

        var message = await ClaimLinkDelivery.IssueAsync(db, messages, app, suggestion, listing.Id, now, cancellationToken).ConfigureAwait(false);
        audit.Record(current.Id, ListingClaims.RecordType, listing.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await messages.PushAsync(cancellationToken).ConfigureAwait(false);
        if (message is not null)
        {
            await email.SendAsync(message, cancellationToken).ConfigureAwait(false);
        }
    }
}
