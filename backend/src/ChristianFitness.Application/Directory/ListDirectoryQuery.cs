using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Directory;

/// <summary>
/// One directory row (L2-054 AC2; ADR 0082): what a published listing publishes and how many events
/// it hosts that are still to come. The kind is its slug; no contact detail or member id is carried.
/// </summary>
public sealed record DirectoryListingRowDto(
    Guid Id, string Kind, string Name, string Tagline, string Area, bool IsVerified, string? PhotoKey, int Hosting);

/// <summary>How many published listings one kind has, whatever the search (L2-054 AC3).</summary>
public sealed record DirectoryKindCountDto(string Kind, int Count);

/// <summary>One page of the directory, the count of each kind, and the cursor of the next page or none.</summary>
public sealed record DirectoryPageDto(IReadOnlyList<DirectoryListingRowDto> Listings, IReadOnlyList<DirectoryKindCountDto> Counts, string? NextCursor);

/// <summary>
/// The published listings in kind order, each kind in name order (L2-054 AC1, AC8), or those of
/// the one kind <paramref name="Kind"/> names by its slug (L2-054 AC3), narrowed to those whose
/// name, tagline, area or focus contain the search <paramref name="Q"/> (L2-054 AC4).
/// </summary>
public sealed record ListDirectoryQuery(string? Kind = null, string? Q = null) : IRequest<DirectoryPageDto>
{
    public const int PageSize = 50;
}

/// <summary>The directory's search and the codes a directory request is refused with (ADR 0077, ADR 0082).</summary>
public static class ListDirectoryRules
{
    public const string KindInvalid = "kind_invalid";
    public const string QueryTooLong = "query_too_long";

    /// <summary>The shortest search, in characters (code points) after trimming; a shorter one is none.</summary>
    public const int SearchMin = 2;

    /// <summary>The longest search, in UTF-16 units after trimming, as the field's <c>maxlength</c> counts.</summary>
    public const int SearchMax = 100;

    public static readonly IReadOnlySet<string> FieldCodes = new HashSet<string>(StringComparer.Ordinal) { KindInvalid };

    /// <summary>The escape character of the search's LIKE pattern.</summary>
    public const string LikeEscape = "\\";

    /// <summary>The search with LIKE's wildcards and the escape character taken literally.</summary>
    public static string EscapeLike(string term) =>
        term.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("%", "\\%", StringComparison.Ordinal).Replace("_", "\\_", StringComparison.Ordinal);

    /// <summary>The folded text a search matches, or none when it is under <see cref="SearchMin"/> characters.</summary>
    public static string? SearchTermOf(string? q)
    {
        var trimmed = q?.Trim();
        return trimmed is null || trimmed.EnumerateRunes().Count() < SearchMin ? null : SearchFold.Of(trimmed);
    }
}

/// <summary>
/// A kind this API does not know is refused with <c>kind_invalid</c>; a search over 100 characters
/// with <c>query_too_long</c> (ADR 0077).
/// </summary>
public sealed class ListDirectoryValidator : AbstractValidator<ListDirectoryQuery>
{
    public ListDirectoryValidator()
    {
        RuleFor(q => q.Kind)
            .Must(kind => kind is null || ListingKinds.KindOf(kind) is not null)
            .WithMessage("Choose one of the kinds")
            .WithErrorCode(ListDirectoryRules.KindInvalid);
        RuleFor(q => q.Q)
            .Must(q => q is null || q.Trim().Length <= ListDirectoryRules.SearchMax)
            .WithMessage("Search with 100 characters or fewer")
            .WithErrorCode(ListDirectoryRules.QueryTooLong);
    }
}

internal sealed class ListDirectoryHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<ListDirectoryQuery, DirectoryPageDto>
{
    public async Task<DirectoryPageDto> Handle(ListDirectoryQuery request, CancellationToken cancellationToken)
    {
        var published = db.DirectoryListings.AsNoTracking().Where(l => l.Status == ListingStatus.Published);
        var counted = await published
            .GroupBy(l => l.Kind)
            .Select(g => new { Kind = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Kind, g => g.Count, cancellationToken)
            .ConfigureAwait(false);

        var listed = ListingKinds.KindOf(request.Kind) is { } kind ? published.Where(l => l.Kind == kind) : published;
        if (ListDirectoryRules.SearchTermOf(request.Q) is { } term)
        {
            // LIKE '%term%', which the trigram index on SearchText serves (ADR 0082); strpos would not.
            var pattern = $"%{ListDirectoryRules.EscapeLike(term)}%";
            listed = listed.Where(l => EF.Functions.Like(l.SearchText, pattern, ListDirectoryRules.LikeEscape));
        }

        var page = await listed
            .OrderBy(l => l.KindOrder)
            .ThenBy(l => l.NameKey)
            .ThenBy(l => l.Id)
            .Take(ListDirectoryQuery.PageSize)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var hosting = await HostingAsync([.. page.Select(l => l.Id)], cancellationToken).ConfigureAwait(false);
        var rows = page
            .Select(l => new DirectoryListingRowDto(
                l.Id, ListingKinds.SlugOf(l.Kind), l.Name, l.Tagline, l.Area, l.IsVerified, l.PhotoKey, hosting.GetValueOrDefault(l.Id)))
            .ToList();
        var counts = ListingKinds.InOrder.Select(kind => new DirectoryKindCountDto(ListingKinds.SlugOf(kind), counted.GetValueOrDefault(kind))).ToList();
        return new DirectoryPageDto(rows, counts, null);
    }

    /// <summary>
    /// The hosting count of each listing (L2-054 AC2; ADR 0082): the published events it hosts that
    /// have not started. Event series join the count when they exist.
    /// </summary>
    private async Task<Dictionary<Guid, int>> HostingAsync(IReadOnlyCollection<Guid> listingIds, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        return await db.Events.AsNoTracking()
            .Where(e => listingIds.Contains(e.HostListingId) && e.Status == EventStatus.Published && e.StartsAt > now)
            .GroupBy(e => e.HostListingId)
            .Select(g => new { Host = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Host, g => g.Count, cancellationToken)
            .ConfigureAwait(false);
    }
}
