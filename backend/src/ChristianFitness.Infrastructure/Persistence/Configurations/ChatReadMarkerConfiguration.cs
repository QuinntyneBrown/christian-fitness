using ChristianFitness.Domain.Events;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>A member's read marker for one conversation (ADR 0042, ADR 0099): one row per member and conversation id.</summary>
internal sealed class ChatReadMarkerConfiguration : IEntityTypeConfiguration<ChatReadMarker>
{
    public void Configure(EntityTypeBuilder<ChatReadMarker> builder)
    {
        builder.ToTable("ChatReadMarkers");
        builder.HasKey(m => new { m.MemberId, m.ScopeId });
    }
}
