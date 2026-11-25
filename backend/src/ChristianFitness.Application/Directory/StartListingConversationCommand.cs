using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Chat;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Directory;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Directory;

/// <summary>The member to open the direct conversation with: the listing's owner.</summary>
public sealed record ListingConversationDto(Guid MemberId);

/// <summary>
/// A member messages a listing (L2-055 AC6, L2-014 AC1 to AC2; ADR 0087): the answer is its owner,
/// whose direct conversation the app opens. Anything but a published listing is 404
/// <c>listing_not_found</c>; a listing with no owner is 409 <c>listing_unreachable</c>; a suspended
/// owner and the caller's own listing are 403 <c>recipient_unavailable</c>, as for a direct
/// conversation. Nothing is stored: a conversation is the pair.
/// </summary>
public sealed record StartListingConversationCommand(Guid ListingId) : IRequest<ListingConversationDto>;

internal sealed class StartListingConversationHandler(IAppDbContext db, ICurrentMember current)
    : IRequestHandler<StartListingConversationCommand, ListingConversationDto>
{
    public async Task<ListingConversationDto> Handle(StartListingConversationCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var listing = await db.DirectoryListings.AsNoTracking()
            .Where(l => l.Id == request.ListingId && l.Status == ListingStatus.Published)
            .Select(l => new { l.MemberId })
            .SingleOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.ListingNotFound, RefusalKind.NotFound);
        var owner = listing.MemberId
            ?? throw new RefusalException(RefusalCodes.ListingUnreachable, RefusalKind.Conflict);

        // The owner's "Let anyone message me" preference (L2-065) arrives with journey 34 and does not
        // apply to a listing's Message; until then nothing else stands between them (ADR 0087).
        var name = await DirectChat.OtherNameAsync(db, current.Id, owner, cancellationToken).ConfigureAwait(false);
        return name is null ? throw DirectChat.Unavailable() : new ListingConversationDto(owner);
    }
}
