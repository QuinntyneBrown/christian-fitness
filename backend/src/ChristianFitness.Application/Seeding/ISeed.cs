using ChristianFitness.Application.Abstractions;

namespace ChristianFitness.Application.Seeding;

/// <summary>One piece of seed data, found by its natural key.</summary>
public interface ISeed
{
    /// <summary>The natural key, for the command's output; never a secret.</summary>
    string Key { get; }

    Task<bool> ExistsAsync(IAppDbContext db, CancellationToken cancellationToken);

    void Apply(IAppDbContext db);
}
