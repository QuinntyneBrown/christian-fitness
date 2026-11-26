using ChristianFitness.Domain.News;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// One row per story and Toronto day (ADR 0105), keyed by both, so two first reads of a day cannot
/// both be added; <see cref="StoryReadTally.Count"/> is the concurrency token. A story's tallies go
/// with it.
/// </summary>
internal sealed class StoryReadTallyConfiguration : IEntityTypeConfiguration<StoryReadTally>
{
    public void Configure(EntityTypeBuilder<StoryReadTally> builder)
    {
        builder.ToTable("StoryReadTallies");
        builder.HasKey(t => new { t.StoryId, t.Day });
        builder.Property(t => t.Count).IsConcurrencyToken();
        builder.HasOne<Story>().WithMany().HasForeignKey(t => t.StoryId).OnDelete(DeleteBehavior.Cascade);
    }
}
