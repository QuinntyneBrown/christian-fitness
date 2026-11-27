using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// A member's data export request (ADR 0117). Preferences reads a member's latest; the builder reads
/// those not yet ready and those whose link has expired. Gone with the member.
/// </summary>
internal sealed class DataExportRequestConfiguration : IEntityTypeConfiguration<DataExportRequest>
{
    public void Configure(EntityTypeBuilder<DataExportRequest> builder)
    {
        builder.ToTable("DataExportRequests");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.ArchiveKey).HasMaxLength(DataExportRequest.ArchiveKeyMaxLength);
        builder.HasOne<Member>().WithMany().HasForeignKey(r => r.MemberId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(r => new { r.MemberId, r.RequestedAt });
        builder.HasIndex(r => r.ReadyAt);
        builder.HasIndex(r => r.ExpiresAt);
    }
}
