using ChristianFitness.Domain.Scheduling;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// One row per kind of scheduled work, by its name (ADR 0069, ADR 0104). <see cref="SchedulerLease.Version"/>
/// is the concurrency token, so a take or renewal is stored only over the row the replica read: of
/// two replicas taking the lease at once, one update matches and the other is refused.
/// </summary>
internal sealed class SchedulerLeaseConfiguration : IEntityTypeConfiguration<SchedulerLease>
{
    public void Configure(EntityTypeBuilder<SchedulerLease> builder)
    {
        builder.ToTable("SchedulerLeases");
        builder.HasKey(l => l.Name);
        builder.Property(l => l.Name).HasMaxLength(SchedulerLease.NameMaxLength);
        builder.Property(l => l.Holder).HasMaxLength(SchedulerLease.HolderMaxLength);
        builder.Property(l => l.Version).IsConcurrencyToken();
    }
}
