using ChristianFitness.Domain.Audit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// The audit trail of staff changes (ADR 0023). No foreign key to the member or the record: an entry
/// outlives both, and the trail is read by record or by staff member, newest first.
/// </summary>
internal sealed class AuditEntryConfiguration : IEntityTypeConfiguration<AuditEntry>
{
    public void Configure(EntityTypeBuilder<AuditEntry> builder)
    {
        builder.ToTable("AuditEntries");
        builder.HasKey(entry => entry.Id);
        builder.Property(entry => entry.Id).ValueGeneratedNever();
        builder.Property(entry => entry.Action).HasMaxLength(AuditEntry.NameLength).IsRequired();
        builder.Property(entry => entry.RecordType).HasMaxLength(AuditEntry.NameLength).IsRequired();
        builder.HasIndex(entry => new { entry.RecordType, entry.RecordId, entry.OccurredAt });
        builder.HasIndex(entry => new { entry.ActorMemberId, entry.OccurredAt });
    }
}
