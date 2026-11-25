using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Directory;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Directory;

/// <summary>
/// The caller's follow of a listing after a follow or unfollow, and the listing's follower count
/// (L2-056 AC1, AC2, AC6; ADR 0088): never who follows it.
/// </summary>
public sealed record ListingFollowDto(bool Following, int Followers);

/// <summary>The signed-in member follows a published listing (L2-056 AC1, AC4).</summary>
public sealed record FollowListingCommand(Guid ListingId) : IRequest<ListingFollowDto>;

/// <summary>The signed-in member stops following a published listing (L2-056 AC2, AC4).</summary>
public sealed record UnfollowListingCommand(Guid ListingId) : IRequest<ListingFollowDto>;

/// <summary>The rules both handlers share: the listing must be published, and the answer counts its followers.</summary>
internal static class ListingFollows
{
    public static async Task EnsurePublishedAsync(IAppDbContext db, Guid listingId, CancellationToken cancellationToken)
    {
        var published = await db.DirectoryListings.AsNoTracking()
            .AnyAsync(l => l.Id == listingId && l.Status == ListingStatus.Published, cancellationToken)
            .ConfigureAwait(false);
        if (!published)
        {
            throw new RefusalException(RefusalCodes.ListingNotFound, RefusalKind.NotFound);
        }
    }

    public static Task<int> CountAsync(IAppDbContext db, Guid listingId, CancellationToken cancellationToken) =>
        db.ListingFollows.AsNoTracking().CountAsync(f => f.ListingId == listingId, cancellationToken);

    public static Task<bool> FollowsAsync(IAppDbContext db, Guid memberId, Guid listingId, CancellationToken cancellationToken) =>
        db.ListingFollows.AsNoTracking().AnyAsync(f => f.MemberId == memberId && f.ListingId == listingId, cancellationToken);
}

/// <summary>
/// Adds the member's follow unless it is there already, so a repeat writes nothing (L2-056 AC4). A
/// second insert of the same pair racing the first is a unique-key conflict, answered as success.
/// Anything but a published listing is 404 <c>listing_not_found</c>.
/// </summary>
internal sealed class FollowListingHandler(IAppDbContext db, ICurrentMember current, TimeProvider time)
    : IRequestHandler<FollowListingCommand, ListingFollowDto>
{
    public async Task<ListingFollowDto> Handle(FollowListingCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var memberId = current.Id;
        await ListingFollows.EnsurePublishedAsync(db, request.ListingId, cancellationToken).ConfigureAwait(false);

        if (!await ListingFollows.FollowsAsync(db, memberId, request.ListingId, cancellationToken).ConfigureAwait(false))
        {
            var follow = ListingFollow.Of(memberId, request.ListingId, time.GetUtcNow());
            db.ListingFollows.Add(follow);
            try
            {
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (DbUpdateException)
            {
                // Another request stored the same pair first: the member follows it either way.
                db.ListingFollows.Entry(follow).State = EntityState.Detached;
                if (!await ListingFollows.FollowsAsync(db, memberId, request.ListingId, cancellationToken).ConfigureAwait(false))
                {
                    throw;
                }
            }
        }

        return new ListingFollowDto(true, await ListingFollows.CountAsync(db, request.ListingId, cancellationToken).ConfigureAwait(false));
    }
}

/// <summary>
/// Removes the member's follow when there is one and otherwise removes nothing (L2-056 AC4).
/// Anything but a published listing is 404 <c>listing_not_found</c>.
/// </summary>
internal sealed class UnfollowListingHandler(IAppDbContext db, ICurrentMember current)
    : IRequestHandler<UnfollowListingCommand, ListingFollowDto>
{
    public async Task<ListingFollowDto> Handle(UnfollowListingCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var memberId = current.Id;
        await ListingFollows.EnsurePublishedAsync(db, request.ListingId, cancellationToken).ConfigureAwait(false);

        var follow = await db.ListingFollows
            .SingleOrDefaultAsync(f => f.MemberId == memberId && f.ListingId == request.ListingId, cancellationToken)
            .ConfigureAwait(false);
        if (follow is not null)
        {
            db.ListingFollows.Remove(follow);
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }

        return new ListingFollowDto(false, await ListingFollows.CountAsync(db, request.ListingId, cancellationToken).ConfigureAwait(false));
    }
}
