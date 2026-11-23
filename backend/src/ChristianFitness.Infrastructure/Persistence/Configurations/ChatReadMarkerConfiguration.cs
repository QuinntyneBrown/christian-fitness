using ChristianFitness.Domain.Events;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>A member's read marker for one event's chat (ADR 0042): one row per pair.</summary>
internal sealed class ChatReadMarkerConfiguration : IEntityTypeConfiguration<ChatReadMarker>
{
    public void Configure(EntityTypeBuilder<ChatReadMarker> builder)
    {
        builder.ToTable("ChatReadMarkers");
        builder.HasKey(m => new { m.MemberId, m.EventId });
    }
}
