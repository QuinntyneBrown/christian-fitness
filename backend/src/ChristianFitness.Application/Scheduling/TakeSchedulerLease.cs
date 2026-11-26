using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Scheduling;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Scheduling;

/// <summary>
/// Takes or renews the scheduler's lease <paramref name="Name"/> for <paramref name="Holder"/> for
/// <paramref name="Duration"/> (ADR 0069, ADR 0104); answers whether this replica holds it now. A
/// replica that does not skips the tick.
/// </summary>
public sealed record TakeSchedulerLeaseCommand(string Name, string Holder, TimeSpan Duration) : IRequest<bool>;

/// <summary>
/// The lease is free when no one holds it or the holder let it expire. A take is atomic: the row is
/// written only over the version read, so of two replicas taking it at once one is refused, and a
/// first take that loses the insert to another is refused by the key.
/// </summary>
internal sealed class TakeSchedulerLeaseHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<TakeSchedulerLeaseCommand, bool>
{
    public async Task<bool> Handle(TakeSchedulerLeaseCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var now = time.GetUtcNow();
        var lease = await db.SchedulerLeases.SingleOrDefaultAsync(l => l.Name == request.Name, cancellationToken).ConfigureAwait(false);
        if (lease is null)
        {
            lease = SchedulerLease.Create(request.Name, now);
            db.SchedulerLeases.Add(lease);
        }

        if (!lease.TryTake(request.Holder, now, request.Duration))
        {
            return false;
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            return true;
        }
        catch (DbUpdateException)
        {
            // Another replica took or renewed it first (a concurrency failure, or the first insert's key).
            return false;
        }
    }
}
