using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Directory;
using ChristianFitness.Domain.Directory;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>A directory listing as the event editor's Host picker shows it (L2-022 AC11; ADR 0088): its kind by slug.</summary>
public sealed record EventHostDto(Guid Id, string Kind, string Name)
{
    public static EventHostDto Of(DirectoryListing listing)
    {
        ArgumentNullException.ThrowIfNull(listing);
        return new(listing.Id, ListingKinds.SlugOf(listing.Kind), listing.Name);
    }
}

/// <summary>The host a new event starts with: the Listed Christian Fitness team listing (ADR 0067, ADR 0088).</summary>
public sealed record GetDefaultEventHostQuery : IRequest<EventHostDto>;

internal sealed class GetDefaultEventHostHandler(IAppDbContext db) : IRequestHandler<GetDefaultEventHostQuery, EventHostDto>
{
    public async Task<EventHostDto> Handle(GetDefaultEventHostQuery request, CancellationToken cancellationToken)
    {
        // The migration and the seed both guarantee the team listing (ADR 0067).
        var team = await db.DirectoryListings.AsNoTracking()
            .SingleAsync(l => l.Id == DirectoryListing.TeamListingId, cancellationToken)
            .ConfigureAwait(false);
        return EventHostDto.Of(team);
    }
}
