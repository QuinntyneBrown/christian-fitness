using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Abstractions;

/// <summary>
/// The unit of work handlers depend on. Tests inject faults through it, since EF Core InMemory
/// raises none of the database's own (AGENTS.md, backend tests).
/// </summary>
public interface IAppDbContext
{
    DbSet<Member> Members { get; }

    DbSet<StaffRole> StaffRoles { get; }

    /// <summary>The reset links issued, by the hash of their token (L2-044; ADR 0010).</summary>
    DbSet<PasswordReset> PasswordResets { get; }

    /// <summary>Whether the database answers; the readiness check asks this.</summary>
    Task<bool> CanConnectAsync(CancellationToken cancellationToken);

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
