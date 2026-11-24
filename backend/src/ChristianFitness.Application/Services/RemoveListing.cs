using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Services;

/// <summary>
/// Removes the live listing <see cref="Id"/> (L2-027 AC2; ADR 0055): the row is deleted, so Services, its
/// detail, contact and booking calls no longer find it. Conversations hang on the two members, not on the
/// listing, so they stay. Audited as <c>listing.removed</c>; the entry keeps no text.
/// </summary>
public sealed record RemoveListingCommand(Guid Id) : IRequest, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "listing.removed";
}

internal sealed class RemoveListingHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit) : IRequestHandler<RemoveListingCommand>
{
    public async Task Handle(RemoveListingCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var listing = await db.ServiceListings.SingleOrDefaultAsync(l => l.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.ServiceNotFound, RefusalKind.NotFound);
        db.ServiceListings.Remove(listing);
        audit.Record(current.Id, UpdateListingHandler.RecordType, listing.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
