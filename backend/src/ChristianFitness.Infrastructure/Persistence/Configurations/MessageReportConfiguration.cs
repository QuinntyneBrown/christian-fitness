using ChristianFitness.Domain.Events;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>A member's report of a message (ADR 0000): one per reporter and message, which the unique index holds against a race.</summary>
internal sealed class MessageReportConfiguration : IEntityTypeConfiguration<MessageReport>
{
    public void Configure(EntityTypeBuilder<MessageReport> builder)
    {
        builder.ToTable("MessageReports");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.Reason).HasMaxLength(MessageReport.ReasonMaxLength);
        builder.HasIndex(r => new { r.ReporterId, r.MessageId }).IsUnique();
        builder.HasIndex(r => r.SenderId);
    }
}
