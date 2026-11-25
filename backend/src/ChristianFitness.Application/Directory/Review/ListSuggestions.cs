using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Directory.Claims;
using ChristianFitness.Domain.Directory;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Directory.Review;

/// <summary>Staff list the suggestions after the one <see cref="After"/> names, or from the oldest (L2-073 AC1, AC2, AC9).</summary>
public sealed record ListListingSuggestionsQuery(Guid? After) : IRequest<SuggestionListDto>;

/// <summary>Staff open one suggestion (L2-073 AC3).</summary>
public sealed record GetListingSuggestionQuery(Guid Id) : IRequest<SuggestionDetailDto>;

/// <summary>
/// The waiting suggestions and those decided in the last 90 days, oldest submitted first, 50 a page
/// (ADR 0077, ADR 0090). An <c>after</c> that names nothing listed starts from the oldest. Reads
/// nothing it does not answer, and logs nothing (L2-073 AC12).
/// </summary>
internal sealed class ListListingSuggestionsHandler(IAppDbContext db, TimeProvider time)
    : IRequestHandler<ListListingSuggestionsQuery, SuggestionListDto>
{
    public const int PageSize = 50;

    public async Task<SuggestionListDto> Handle(ListListingSuggestionsQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var shownSince = time.GetUtcNow() - ListingSuggestion.ListedAfterDecision;
        var shown = db.ListingSuggestions.AsNoTracking()
            .Where(s => s.Status == SuggestionStatus.Waiting || s.DecidedAt > shownSince);
        var waiting = await db.ListingSuggestions.CountAsync(s => s.Status == SuggestionStatus.Waiting, cancellationToken).ConfigureAwait(false);
        var listed = await db.DirectoryListings.CountAsync(l => l.Status == ListingStatus.Published, cancellationToken).ConfigureAwait(false);
        if (request.After is { } after
            && await shown.Where(s => s.Id == after).Select(s => new { s.SubmittedAt }).SingleOrDefaultAsync(cancellationToken).ConfigureAwait(false) is { } cut)
        {
            shown = shown.Where(s => s.SubmittedAt > cut.SubmittedAt || (s.SubmittedAt == cut.SubmittedAt && s.Id.CompareTo(after) > 0));
        }

        var page = await shown
            .OrderBy(s => s.SubmittedAt).ThenBy(s => s.Id)
            .Take(PageSize + 1)
            .Select(s => new { s.Id, s.Name, s.Kind, s.Where, s.Relation, s.SuggestedById, s.SubmittedAt, s.Status })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var senderIds = page.Select(s => s.SuggestedById).Distinct().ToList();
        var senders = await db.Members.AsNoTracking()
            .Where(m => senderIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, m => m.Name, cancellationToken)
            .ConfigureAwait(false);
        var rows = page.Take(PageSize).Select(s => new SuggestionSummaryDto(
            s.Id,
            s.Name,
            ListingKinds.SlugOf(s.Kind),
            s.Where,
            s.Relation == SuggestionRelation.Myself ? null : senders.GetValueOrDefault(s.SuggestedById),
            s.SubmittedAt,
            SuggestionReview.StatusSlugOf(s.Status))).ToList();
        return new SuggestionListDto(waiting, listed, rows, page.Count > PageSize ? rows[^1].Id : null);
    }
}

/// <summary>
/// Answers the panel's fields, the four checks and where an approved suggestion's claim stands (ADR 0091);
/// an unknown id is 404 <c>suggestion_not_found</c>.
/// </summary>
internal sealed class GetListingSuggestionHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<GetListingSuggestionQuery, SuggestionDetailDto>
{
    public async Task<SuggestionDetailDto> Handle(GetListingSuggestionQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var suggestion = await SuggestionReview.FindAsync(db, request.Id, cancellationToken).ConfigureAwait(false);
        var sender = suggestion.Relation == SuggestionRelation.Myself
            ? null
            : await db.Members.AsNoTracking().Where(m => m.Id == suggestion.SuggestedById).Select(m => m.Name).SingleOrDefaultAsync(cancellationToken).ConfigureAwait(false);
        return new SuggestionDetailDto(
            suggestion.Id,
            ListingKinds.SlugOf(suggestion.Kind),
            suggestion.Name,
            suggestion.Where,
            suggestion.Website,
            suggestion.Reason,
            SuggestionReview.RelationSlugOf(suggestion.Relation),
            sender,
            suggestion.SubmittedAt,
            SuggestionReview.StatusSlugOf(suggestion.Status),
            SuggestionReview.ChecksOf(await SuggestionReview.RowsAsync(db, suggestion.Id, cancellationToken).ConfigureAwait(false)),
            await ClaimLinkDelivery.StateOfAsync(db, suggestion, time.GetUtcNow(), cancellationToken).ConfigureAwait(false));
    }
}
