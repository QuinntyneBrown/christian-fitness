using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Sessions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.News;

/// <summary>
/// Remove byline (L2-077 AC6, AC7; ADR 0094): a byline no story uses leaves the list. One a story
/// uses is refused with 409 <c>byline_in_use</c>; an unknown one is 404 <c>not_found</c>. Audited
/// <c>byline.removed</c> as <c>Byline</c>.
/// </summary>
public sealed record RemoveBylineCommand(Guid Id) : IRequest, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "byline.removed";
}

internal sealed class RemoveBylineHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<RemoveBylineCommand>
{
    public async Task Handle(RemoveBylineCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var byline = await db.Bylines.SingleOrDefaultAsync(b => b.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        if (await InUseAsync(byline.Id, cancellationToken).ConfigureAwait(false))
        {
            throw InUse();
        }

        db.Bylines.Remove(byline);
        audit.Record(current.Id, BylineAnswers.RecordType, byline.Id);
        try
        {
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (DbUpdateException exception)
        {
            // A story took the byline after the check: its restricted key refuses the removal.
            db.Bylines.Entry(byline).State = EntityState.Unchanged;
            if (await InUseAsync(byline.Id, cancellationToken).ConfigureAwait(false))
            {
                throw InUse(exception);
            }

            throw;
        }
    }

    private Task<bool> InUseAsync(Guid id, CancellationToken cancellationToken) =>
        db.Stories.AnyAsync(s => s.BylineId == id, cancellationToken);

    private static RefusalException InUse(Exception? inner = null) => new(RefusalCodes.BylineInUse, RefusalKind.Conflict, inner);
}
