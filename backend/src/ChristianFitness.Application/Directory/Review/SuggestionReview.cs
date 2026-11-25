using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Directory;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Directory.Review;

/// <summary>One suggestion in the console's list (L2-073 AC2; ADR 0090). <see cref="From"/> is none for a self-submission.</summary>
public sealed record SuggestionSummaryDto(Guid Id, string Name, string Kind, string Area, string? From, DateTimeOffset SubmittedAt, string Status);

/// <summary>
/// <c>GET api/admin/directory/suggestions</c>: how many wait, how many listings are published, one page of
/// suggestions oldest first, and the id to ask <c>after</c> for the next page, or none (ADR 0090).
/// </summary>
public sealed record SuggestionListDto(int Waiting, int Listed, IReadOnlyList<SuggestionSummaryDto> Suggestions, Guid? Next);

/// <summary>One of the four checks and whether it passed (L2-073 AC3).</summary>
public sealed record SuggestionCheckDto(string Check, bool Passed);

/// <summary>The chosen suggestion as the panel shows it (L2-073 AC3; ADR 0090). The contact email and the church connection are not sent.</summary>
public sealed record SuggestionDetailDto(
    Guid Id,
    string Kind,
    string Name,
    string Area,
    string? Website,
    string? Reason,
    string Relation,
    string? From,
    DateTimeOffset SubmittedAt,
    string Status,
    IReadOnlyList<SuggestionCheckDto> Checks);

/// <summary>The slugs and lookups the review shares (ADR 0090).</summary>
public static class SuggestionReview
{
    /// <summary>The record type an audit entry names a suggestion by.</summary>
    public const string RecordType = "ListingSuggestion";

    /// <summary>
    /// Marks for deletion the suggestions decided more than <see cref="ListingSuggestion.KeptAfterDecision"/>
    /// before <paramref name="now"/>, with their checks (L2-073 AC9; ADR 0090), for the caller's save, as
    /// ADR 0083 sweeps notifications on write. The checks go explicitly as well as by cascade, so a store
    /// without cascades keeps none.
    /// </summary>
    public static async Task SweepAsync(IAppDbContext db, DateTimeOffset now, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);
        var cutoff = now - ListingSuggestion.KeptAfterDecision;
        var expired = await db.ListingSuggestions
            .Where(s => s.Status != SuggestionStatus.Waiting && s.DecidedAt < cutoff)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        if (expired.Count == 0)
        {
            return;
        }

        var ids = expired.Select(s => s.Id).ToList();
        db.SuggestionChecks.RemoveRange(await db.SuggestionChecks.Where(c => ids.Contains(c.SuggestionId)).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.ListingSuggestions.RemoveRange(expired);
    }

    private static readonly Dictionary<SuggestionRelation, string> RelationSlugs = new()
    {
        [SuggestionRelation.Myself] = "myself",
        [SuggestionRelation.SomeoneIKnow] = "someone-i-know",
        [SuggestionRelation.SomewhereIveBeen] = "somewhere-ive-been",
    };

    private static readonly Dictionary<SuggestionStatus, string> StatusSlugs = new()
    {
        [SuggestionStatus.Waiting] = "waiting",
        [SuggestionStatus.Approved] = "approved",
        [SuggestionStatus.Declined] = "declined",
    };

    public static string RelationSlugOf(SuggestionRelation relation) => RelationSlugs[relation];

    public static string StatusSlugOf(SuggestionStatus status) => StatusSlugs[status];

    /// <summary>The suggestion with <paramref name="id"/>, tracked, or 404 <c>suggestion_not_found</c>.</summary>
    public static async Task<ListingSuggestion> FindAsync(IAppDbContext db, Guid id, CancellationToken cancellationToken) =>
        await db.ListingSuggestions.SingleOrDefaultAsync(s => s.Id == id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.SuggestionNotFound, RefusalKind.NotFound);

    /// <summary>The four checks in the panel's order, and whether each passed.</summary>
    public static IReadOnlyList<SuggestionCheckDto> ChecksOf(IEnumerable<SuggestionCheck> rows)
    {
        var passed = rows.Where(row => row.Passed).Select(row => row.Check).ToHashSet();
        return [.. Enum.GetValues<ListingCheck>().Select(check => new SuggestionCheckDto(CheckSlugOf(check), passed.Contains(check)))];
    }

    /// <summary>The checks set on the suggestion <paramref name="id"/>.</summary>
    public static Task<List<SuggestionCheck>> RowsAsync(IAppDbContext db, Guid id, CancellationToken cancellationToken) =>
        db.SuggestionChecks.Where(c => c.SuggestionId == id).ToListAsync(cancellationToken);

    private static readonly Dictionary<ListingCheck, string> CheckSlugs = new()
    {
        [ListingCheck.Credentials] = "credentials",
        [ListingCheck.Insurance] = "insurance",
        [ListingCheck.TwoReferences] = "two-references",
        [ListingCheck.Conversation] = "conversation",
    };

    public static string CheckSlugOf(ListingCheck check) => CheckSlugs[check];

    /// <summary>The check an exact slug names, or none.</summary>
    public static ListingCheck? CheckOf(string? slug) =>
        slug is null ? null : CheckSlugs.Where(pair => pair.Value == slug).Select(pair => (ListingCheck?)pair.Key).FirstOrDefault();

    public static RefusalException Decided() => new(RefusalCodes.SuggestionDecided, RefusalKind.Conflict);
}
