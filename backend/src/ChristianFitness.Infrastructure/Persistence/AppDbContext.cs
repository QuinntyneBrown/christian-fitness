using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Audit;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Sessions;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Infrastructure.Persistence;

/// <summary>The Christian Fitness database: PostgreSQL in production (ADR 0004), InMemory in tests.</summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<Member> Members => Set<Member>();

    public DbSet<StaffRole> StaffRoles => Set<StaffRole>();

    public DbSet<PasswordReset> PasswordResets => Set<PasswordReset>();
    public DbSet<SignInFailure> SignInFailures => Set<SignInFailure>();

    public DbSet<StaffTwoStep> StaffTwoSteps => Set<StaffTwoStep>();

    public DbSet<TwoStepChallenge> TwoStepChallenges => Set<TwoStepChallenge>();

    public DbSet<TwoStepFailure> TwoStepFailures => Set<TwoStepFailure>();

    public DbSet<Event> Events => Set<Event>();

    public DbSet<Registration> Registrations => Set<Registration>();

    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<ChatReadMarker> ChatReadMarkers => Set<ChatReadMarker>();

    public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();

    /// <summary>The signed-in sessions (<see cref="Security.DatabaseTicketStore"/>); only the cookie scheme reads them.</summary>
    public DbSet<SessionRecord> Sessions => Set<SessionRecord>();

    public Task<bool> CanConnectAsync(CancellationToken cancellationToken) =>
        Database.CanConnectAsync(cancellationToken);

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
}
