using ChristianFitness.Domain.Events;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>A stored chat message (ADR 0040): read newest first per conversation scope (ADR 0099), its kind stored by name.</summary>
internal sealed class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> builder)
    {
        builder.ToTable("ChatMessages");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).ValueGeneratedNever();
        builder.Property(m => m.Text).HasMaxLength(2000).IsRequired();
        builder.Property(m => m.ScopeKind).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.HasIndex(m => new { m.ScopeId, m.SentAt, m.Id });
    }
}
