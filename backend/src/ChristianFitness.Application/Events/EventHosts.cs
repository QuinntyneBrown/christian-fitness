using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Directory;
using ChristianFitness.Domain.Directory;
using FluentValidation;
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

/// <summary>The Host picker's matches (L2-022 AC11; ADR 0088), at most <see cref="SearchEventHostsQuery.Limit"/>.</summary>
public sealed record EventHostListDto(IReadOnlyList<EventHostDto> Hosts);

/// <summary>
/// Listed directory listings whose folded name contains the folded search, in name order (ADR 0088).
/// A search under 2 characters answers none; the directory's rules fold and escape it (ADR 0082).
/// </summary>
public sealed record SearchEventHostsQuery(string? Q) : IRequest<EventHostListDto>
{
    public const int Limit = 10;
}

/// <summary>A search over 100 characters is refused with <c>query_too_long</c>, as the directory's is.</summary>
public sealed class SearchEventHostsValidator : AbstractValidator<SearchEventHostsQuery>
{
    public SearchEventHostsValidator()
    {
        RuleFor(q => q.Q)
            .Must(q => q is null || q.Trim().Length <= ListDirectoryRules.SearchMax)
            .WithMessage("Search with 100 characters or fewer")
            .WithErrorCode(ListDirectoryRules.QueryTooLong);
    }
}

internal sealed class SearchEventHostsHandler(IAppDbContext db) : IRequestHandler<SearchEventHostsQuery, EventHostListDto>
{
    public async Task<EventHostListDto> Handle(SearchEventHostsQuery request, CancellationToken cancellationToken)
    {
        if (ListDirectoryRules.SearchTermOf(request.Q) is not { } term)
        {
            return new EventHostListDto([]);
        }

        var pattern = $"%{ListDirectoryRules.EscapeLike(term)}%";
        var listings = await db.DirectoryListings.AsNoTracking()
            .Where(l => l.Status == ListingStatus.Published && EF.Functions.Like(l.NameKey, pattern, ListDirectoryRules.LikeEscape))
            .OrderBy(l => l.NameKey)
            .ThenBy(l => l.Id)
            .Take(SearchEventHostsQuery.Limit)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return new EventHostListDto([.. listings.Select(EventHostDto.Of)]);
    }
}
