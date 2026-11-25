using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Directory;
using MediatR;

namespace ChristianFitness.Application.Directory.Review;

/// <summary>The four checks after a change (ADR 0090).</summary>
public sealed record SuggestionChecksDto(IReadOnlyList<SuggestionCheckDto> Checks);

/// <summary>
/// Staff tick or untick the check <see cref="Check"/> (a slug) of the suggestion <see cref="SuggestionId"/>
/// (L2-073 AC4; ADR 0090). Audited <c>suggestion.check_set</c> when it changes something.
/// </summary>
public sealed record SetSuggestionCheckCommand(Guid SuggestionId, string Check, bool Passed) : IRequest<SuggestionChecksDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "suggestion.check_set";
}

/// <summary>
/// Saves the check with who and when, or nothing when it already has that value. An unknown check
/// is 404 <c>not_found</c>, an unknown suggestion 404 <c>suggestion_not_found</c> and a decided one
/// 409 <c>suggestion_decided</c>. Logs nothing (L2-073 AC12).
/// </summary>
internal sealed class SetSuggestionCheckHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit, TimeProvider time)
    : IRequestHandler<SetSuggestionCheckCommand, SuggestionChecksDto>
{
    public async Task<SuggestionChecksDto> Handle(SetSuggestionCheckCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var check = SuggestionReview.CheckOf(request.Check) ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        var suggestion = await SuggestionReview.FindAsync(db, request.SuggestionId, cancellationToken).ConfigureAwait(false);
        if (suggestion.Status != SuggestionStatus.Waiting)
        {
            throw SuggestionReview.Decided();
        }

        var rows = await SuggestionReview.RowsAsync(db, suggestion.Id, cancellationToken).ConfigureAwait(false);
        var row = rows.SingleOrDefault(r => r.Check == check);
        var now = time.GetUtcNow();
        bool changed;
        if (row is null)
        {
            changed = request.Passed;
            if (changed)
            {
                row = SuggestionCheck.Set(suggestion.Id, check, true, current.Id, now);
                db.SuggestionChecks.Add(row);
                rows.Add(row);
            }
        }
        else
        {
            changed = row.Change(request.Passed, current.Id, now);
        }

        if (!changed)
        {
            audit.Unchanged();
            return new SuggestionChecksDto(SuggestionReview.ChecksOf(rows));
        }

        audit.Record(current.Id, SuggestionReview.RecordType, suggestion.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new SuggestionChecksDto(SuggestionReview.ChecksOf(rows));
    }
}
