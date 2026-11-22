using ChristianFitness.Application.Abstractions;

namespace ChristianFitness.Application.Seeding;

/// <summary>
/// Applies each seed whose natural key is absent and saves once, so a second run changes nothing
/// (L2-041 AC2). Returns the number of seeds applied.
/// </summary>
public sealed class SeedRunner(IEnumerable<ISeed> seeds, IAppDbContext db)
{
    public async Task<int> RunAsync(CancellationToken cancellationToken)
    {
        var applied = 0;
        foreach (var seed in seeds)
        {
            if (await seed.ExistsAsync(db, cancellationToken).ConfigureAwait(false))
            {
                continue;
            }

            seed.Apply(db);
            applied++;
        }

        if (applied > 0)
        {
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }

        return applied;
    }
}
