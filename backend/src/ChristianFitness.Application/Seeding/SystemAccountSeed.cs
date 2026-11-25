using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Seeding;

/// <summary>
/// The Christian Fitness system account (ADR 0065, ADR 0090), keyed by its fixed id: added when
/// missing, never changed when present. Always seeded, since suggestion outcomes and claim links are
/// sent from it.
/// </summary>
public sealed class SystemAccountSeed(TimeProvider time) : ISeed
{
    public string Key => "Christian Fitness system account";

    public Task<bool> ExistsAsync(IAppDbContext db, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);
        return db.Members.AnyAsync(m => m.Id == SystemMembers.ChristianFitnessId, cancellationToken);
    }

    public void Apply(IAppDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
        db.Members.Add(Member.ChristianFitness(time.GetUtcNow()));
    }
}
