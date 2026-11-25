using ChristianFitness.Domain.Directory;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// A suggestion's check (ADR 0090): one row per suggestion and check, the check stored by name, and
/// deleted with its suggestion.
/// </summary>
internal sealed class SuggestionCheckConfiguration : IEntityTypeConfiguration<SuggestionCheck>
{
    public void Configure(EntityTypeBuilder<SuggestionCheck> builder)
    {
        builder.ToTable("SuggestionChecks");
        builder.HasKey(c => new { c.SuggestionId, c.Check });
        builder.Property(c => c.Check).HasConversion<string>().HasMaxLength(20);
        builder.HasOne<ListingSuggestion>().WithMany().HasForeignKey(c => c.SuggestionId).OnDelete(DeleteBehavior.Cascade);
    }
}
