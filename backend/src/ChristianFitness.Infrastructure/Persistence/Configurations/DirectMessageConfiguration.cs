using ChristianFitness.Domain.Events;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>A stored direct message (ADR 0043): read by pair, newest first.</summary>
internal sealed class DirectMessageConfiguration : IEntityTypeConfiguration<DirectMessage>
{
    public void Configure(EntityTypeBuilder<DirectMessage> builder)
    {
        builder.ToTable("DirectMessages");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).ValueGeneratedNever();
        builder.Property(m => m.Text).HasMaxLength(2000).IsRequired();
        builder.HasIndex(m => new { m.SenderId, m.RecipientId, m.SentAt });
        builder.HasIndex(m => new { m.RecipientId, m.SenderId, m.SentAt });
    }
}
