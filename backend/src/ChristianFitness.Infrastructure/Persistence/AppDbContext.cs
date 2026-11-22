using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Infrastructure.Persistence;

/// <summary>The Christian Fitness database: PostgreSQL in production (ADR 0004), InMemory in tests.</summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<Member> Members => Set<Member>();

    public DbSet<StaffRole> StaffRoles => Set<StaffRole>();

    public Task<bool> CanConnectAsync(CancellationToken cancellationToken) =>
        Database.CanConnectAsync(cancellationToken);

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
}
