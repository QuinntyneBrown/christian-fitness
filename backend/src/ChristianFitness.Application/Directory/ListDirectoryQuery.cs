using System.Globalization;
using System.Text;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Directory;

/// <summary>
/// One directory row (L2-054 AC2; ADR 0082): what a published listing publishes and how many events
/// it hosts that are still to come, and whether the signed-in caller follows it (<c>false</c> for an
/// anonymous caller, ADR 0088). The kind is its slug; no contact detail or member id is carried.
/// </summary>
public sealed record DirectoryListingRowDto(
    Guid Id, string Kind, string Name, string Tagline, string Area, bool IsVerified, string? PhotoKey, int Hosting, bool Following);

/// <summary>How many published listings one kind has, whatever the search (L2-054 AC3).</summary>
public sealed record DirectoryKindCountDto(string Kind, int Count);

/// <summary>One page of the directory, the count of each kind, and the cursor of the next page or none.</summary>
public sealed record DirectoryPageDto(IReadOnlyList<DirectoryListingRowDto> Listings, IReadOnlyList<DirectoryKindCountDto> Counts, string? NextCursor);

/// <summary>
/// The published listings in kind order, each kind in name order (L2-054 AC1, AC8), or those of
/// the one kind <paramref name="Kind"/> names by its slug (L2-054 AC3), narrowed to those whose
/// name, tagline, area or focus contain the search <paramref name="Q"/> (L2-054 AC4), 50 to a page
/// after the opaque <paramref name="Cursor"/> (L2-054 AC7).
/// </summary>
public sealed record ListDirectoryQuery(string? Kind = null, string? Q = null, string? Cursor = null) : IRequest<DirectoryPageDto>
{
    public const int PageSize = 50;
}

/// <summary>The directory's search and the codes a directory request is refused with (ADR 0077, ADR 0082).</summary>
public static class ListDirectoryRules
{
    public const string KindInvalid = "kind_invalid";
    public const string QueryTooLong = "query_too_long";
    public const string CursorInvalid = "cursor_invalid";

    /// <summary>The shortest search, in characters (code points) after trimming; a shorter one is none.</summary>
    public const int SearchMin = 2;

    /// <summary>The longest search, in UTF-16 units after trimming, as the field's <c>maxlength</c> counts.</summary>
    public const int SearchMax = 100;

    public static readonly IReadOnlySet<string> FieldCodes = new HashSet<string>(StringComparer.Ordinal) { KindInvalid, CursorInvalid };

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
        RuleFor(q => q.Cursor)
            .Must(cursor => cursor is null || DirectoryCursor.TryParse(cursor, out _))
            .WithMessage("The list could not continue")
            .WithErrorCode(ListDirectoryRules.CursorInvalid);
    }
}

/// <summary>
/// The kind order, id and folded name of the last listing of a page, as an opaque URL-safe text:
/// the next page starts after it in kind, name and id order (ADR 0082).
/// </summary>
internal static class DirectoryCursor
{
    public static string Of(DirectoryListing last) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes(
                $"{last.KindOrder.ToString(CultureInfo.InvariantCulture)}|{last.Id:N}|{last.NameKey}"))
            .Replace("+", "-", StringComparison.Ordinal).Replace("/", "_", StringComparison.Ordinal).TrimEnd('=');

    public static bool TryParse(string cursor, out (int KindOrder, Guid Id, string NameKey) value)
    {
        value = default;
        var padded = cursor.Replace("-", "+", StringComparison.Ordinal).Replace("_", "/", StringComparison.Ordinal);
        padded = padded.PadRight(padded.Length + ((4 - (padded.Length % 4)) % 4), '=');
        var bytes = new byte[padded.Length];
        if (!Convert.TryFromBase64String(padded, bytes, out var written))
        {
            return false;
        }

        // The name comes last, so a '|' in it stays part of it.
        var parts = Encoding.UTF8.GetString(bytes, 0, written).Split('|', 3);
        if (parts.Length != 3
            || !int.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out var kindOrder)
            || !Enum.IsDefined((ListingKind)kindOrder)
            || !Guid.TryParseExact(parts[1], "N", out var id)
            || parts[2].Length > DirectoryListing.NameMaxLength)
        {
            return false;
        }

        value = (kindOrder, id, parts[2]);
        return true;
    }
}

internal sealed class ListDirectoryHandler(IAppDbContext db, ICurrentMember current, TimeProvider time) : IRequestHandler<ListDirectoryQuery, DirectoryPageDto>
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

        if (request.Cursor is not null && DirectoryCursor.TryParse(request.Cursor, out var after))
        {
            listed = listed.Where(l =>
                l.KindOrder > after.KindOrder
                || (l.KindOrder == after.KindOrder && l.NameKey.CompareTo(after.NameKey) > 0)
                || (l.KindOrder == after.KindOrder && l.NameKey == after.NameKey && l.Id.CompareTo(after.Id) > 0));
        }

        var found = await listed
            .OrderBy(l => l.KindOrder)
            .ThenBy(l => l.NameKey)
            .ThenBy(l => l.Id)
            .Take(ListDirectoryQuery.PageSize + 1)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var page = found.Take(ListDirectoryQuery.PageSize).ToList();

        var ids = page.Select(l => l.Id).ToList();
        var hosting = await HostingAsync(ids, cancellationToken).ConfigureAwait(false);
        var followed = await FollowedAsync(ids, cancellationToken).ConfigureAwait(false);
        var rows = page
            .Select(l => new DirectoryListingRowDto(
                l.Id, ListingKinds.SlugOf(l.Kind), l.Name, l.Tagline, l.Area, l.IsVerified, l.PhotoKey, hosting.GetValueOrDefault(l.Id), followed.Contains(l.Id)))
            .ToList();
        var counts = ListingKinds.InOrder.Select(kind => new DirectoryKindCountDto(ListingKinds.SlugOf(kind), counted.GetValueOrDefault(kind))).ToList();
        var next = found.Count > ListDirectoryQuery.PageSize ? DirectoryCursor.Of(page[^1]) : null;
        return new DirectoryPageDto(rows, counts, next);
    }

    /// <summary>The listings of the page the signed-in caller follows; none for an anonymous caller (ADR 0088).</summary>
    private async Task<HashSet<Guid>> FollowedAsync(IReadOnlyCollection<Guid> listingIds, CancellationToken cancellationToken)
    {
        if (current.SignedInId is not { } memberId)
        {
            return [];
        }

        var followed = await db.ListingFollows.AsNoTracking()
            .Where(f => f.MemberId == memberId && listingIds.Contains(f.ListingId))
            .Select(f => f.ListingId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return [.. followed];
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
