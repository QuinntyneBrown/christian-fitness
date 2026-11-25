using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
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

    /// <summary>
    /// Logs one change for the hourly limit (L2-056 AC9; ADR 0088): with 60 in the last rolling hour
    /// it is refused 429 <c>too_many_attempts</c> and not logged; otherwise the member's changes older
    /// than the hour are deleted and this one is added, saved with the change itself.
    /// </summary>
    public static async Task LogChangeAsync(IAppDbContext db, Guid memberId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var since = ListingFollowChange.HourlyWindow.Since(now);
        var recent = await db.ListingFollowChanges.CountAsync(c => c.MemberId == memberId && c.ChangedAt > since, cancellationToken).ConfigureAwait(false);
        if (ListingFollowChange.HourlyWindow.IsFull(recent))
        {
            throw new RefusalException(RefusalCodes.TooManyAttempts, RefusalKind.TooManyRequests);
        }

        var expired = await db.ListingFollowChanges.Where(c => c.MemberId == memberId && c.ChangedAt <= since).ToListAsync(cancellationToken).ConfigureAwait(false);
        db.ListingFollowChanges.RemoveRange(expired);
        db.ListingFollowChanges.Add(ListingFollowChange.Of(memberId, now));
    }

    public static Task<int> CountAsync(IAppDbContext db, Guid listingId, CancellationToken cancellationToken) =>
        db.ListingFollows.AsNoTracking().CountAsync(f => f.ListingId == listingId, cancellationToken);

    public static Task<bool> FollowsAsync(IAppDbContext db, Guid memberId, Guid listingId, CancellationToken cancellationToken) =>
        db.ListingFollows.AsNoTracking().AnyAsync(f => f.MemberId == memberId && f.ListingId == listingId, cancellationToken);
}

/// <summary>
/// Adds the member's follow unless it is there already, so a repeat writes no follow (L2-056 AC4). A
/// second insert of the same pair racing the first is a unique-key conflict, answered as success. A
/// suspended member is refused 403 <c>account_suspended</c> (AC5); anything but a published listing
/// is 404 <c>listing_not_found</c>; past the hourly limit it is 429 <c>too_many_attempts</c> (AC9).
/// </summary>
internal sealed class FollowListingHandler(IAppDbContext db, ICurrentMember current, TimeProvider time)
    : IRequestHandler<FollowListingCommand, ListingFollowDto>
{
    public async Task<ListingFollowDto> Handle(FollowListingCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var memberId = current.Id;
        var status = await db.Members.AsNoTracking().Where(m => m.Id == memberId).Select(m => m.Status).SingleAsync(cancellationToken).ConfigureAwait(false);
        if (status == MemberStatus.Suspended)
        {
            throw new RefusalException(RefusalCodes.AccountSuspended, RefusalKind.Forbidden);
        }

        await ListingFollows.EnsurePublishedAsync(db, request.ListingId, cancellationToken).ConfigureAwait(false);
        var now = time.GetUtcNow();
        await ListingFollows.LogChangeAsync(db, memberId, now, cancellationToken).ConfigureAwait(false);

        if (await ListingFollows.FollowsAsync(db, memberId, request.ListingId, cancellationToken).ConfigureAwait(false))
        {
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
        else
        {
            var follow = ListingFollow.Of(memberId, request.ListingId, now);
            db.ListingFollows.Add(follow);
            try
            {
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (DbUpdateException)
            {
                // Another request stored the same pair first: the member follows it either way, and
                // this change is still logged.
                db.ListingFollows.Entry(follow).State = EntityState.Detached;
                if (!await ListingFollows.FollowsAsync(db, memberId, request.ListingId, cancellationToken).ConfigureAwait(false))
                {
                    throw;
                }

                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            }
        }

        return new ListingFollowDto(true, await ListingFollows.CountAsync(db, request.ListingId, cancellationToken).ConfigureAwait(false));
    }
}

/// <summary>
/// Removes the member's follow when there is one and otherwise removes nothing (L2-056 AC4). A
/// suspended member may unfollow (ADR 0088). Anything but a published listing is 404
/// <c>listing_not_found</c>; past the hourly limit it is 429 <c>too_many_attempts</c> (AC9).
/// </summary>
internal sealed class UnfollowListingHandler(IAppDbContext db, ICurrentMember current, TimeProvider time)
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
        await ListingFollows.LogChangeAsync(db, memberId, time.GetUtcNow(), cancellationToken).ConfigureAwait(false);
        if (follow is not null)
        {
            db.ListingFollows.Remove(follow);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new ListingFollowDto(false, await ListingFollows.CountAsync(db, request.ListingId, cancellationToken).ConfigureAwait(false));
    }
}
