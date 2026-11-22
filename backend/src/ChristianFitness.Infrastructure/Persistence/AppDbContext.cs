using ChristianFitness.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Infrastructure.Persistence;

/// <summary>The Christian Fitness database: PostgreSQL in production (ADR 0004), InMemory in tests.</summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public Task<bool> CanConnectAsync(CancellationToken cancellationToken) =>
        Database.CanConnectAsync(cancellationToken);
}
