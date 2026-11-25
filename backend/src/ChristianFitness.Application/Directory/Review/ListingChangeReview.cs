using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Directory;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Directory.Review;

/// <summary>
/// Staff approve the name and kind an owner asked for (L2-079 AC5; ADR 0095): they go live. Audited
/// <c>listing.change_approved</c>.
/// </summary>
public sealed record ApproveListingChangeCommand(Guid Id) : IRequest<ListedListingDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "listing.change_approved";
}

/// <summary>
/// Staff decline the name and kind an owner asked for (L2-079 AC5; ADR 0095): the live ones stay.
/// Audited <c>listing.change_declined</c>.
/// </summary>
public sealed record DeclineListingChangeCommand(Guid Id) : IRequest<ListedListingDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "listing.change_declined";
}

/// <summary>
/// Decides a waiting change. Anything but a published listing is 404 <c>listing_not_found</c>; one
/// with nothing waiting is 409 <c>no_change_waiting</c>, so a second decision changes nothing.
/// </summary>
internal sealed class ListingChangeReviewHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<ApproveListingChangeCommand, ListedListingDto>, IRequestHandler<DeclineListingChangeCommand, ListedListingDto>
{
    public Task<ListedListingDto> Handle(ApproveListingChangeCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        return DecideAsync(request.Id, listing => listing.ApproveRename(), cancellationToken);
    }

    public Task<ListedListingDto> Handle(DeclineListingChangeCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        return DecideAsync(request.Id, listing => listing.DeclineRename(), cancellationToken);
    }

    private async Task<ListedListingDto> DecideAsync(Guid id, Action<DirectoryListing> decide, CancellationToken cancellationToken)
    {
        var listing = await db.DirectoryListings
            .SingleOrDefaultAsync(l => l.Id == id && l.Status == ListingStatus.Published, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.ListingNotFound, RefusalKind.NotFound);
        if (listing.PendingName is null)
        {
            throw new RefusalException(RefusalCodes.NoChangeWaiting, RefusalKind.Conflict);
        }

        decide(listing);
        audit.Record(current.Id, ListedListing.RecordType, listing.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return ListedListing.Of(listing, await ListingFollows.CountAsync(db, listing.Id, cancellationToken).ConfigureAwait(false));
    }
}
