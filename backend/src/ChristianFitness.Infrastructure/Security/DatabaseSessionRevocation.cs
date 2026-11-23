using ChristianFitness.Application.Abstractions;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Infrastructure.Security;

/// <summary>
/// Ends a member's sessions by removing their <see cref="SessionRecord"/> rows through the request's
/// <see cref="AppDbContext"/>, the same instance as its <see cref="IAppDbContext"/>, so they are
/// deleted by the handler's one <c>SaveChanges</c> (ADR 0014). A cookie held for one of them then
/// opens nothing (<see cref="DatabaseTicketStore"/>).
/// </summary>
internal sealed class DatabaseSessionRevocation(AppDbContext db) : ISessionRevocation
{
    public async Task EndAllAsync(Guid memberId, CancellationToken cancellationToken)
    {
        var sessions = await db.Sessions
            .Where(session => session.MemberId == memberId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        db.Sessions.RemoveRange(sessions);
    }
}
