using ChristianFitness.Domain.Directory;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// A listing suggestion (ADR 0085). Relation, kind and status are stored by name. The daily limit
/// counts a member's suggestions since a time; staff's review reads them by status.
/// </summary>
internal sealed class ListingSuggestionConfiguration : IEntityTypeConfiguration<ListingSuggestion>
{
    public void Configure(EntityTypeBuilder<ListingSuggestion> builder)
    {
        builder.ToTable("ListingSuggestions");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedNever();
        builder.Property(s => s.Relation).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(s => s.Kind).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(s => s.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(s => s.Name).HasMaxLength(ListingSuggestion.NameMaxLength).IsRequired();
        builder.Property(s => s.Where).HasMaxLength(ListingSuggestion.WhereMaxLength).IsRequired();
        builder.Property(s => s.Website).HasMaxLength(ListingSuggestion.WebsiteMaxLength);
        builder.Property(s => s.ChurchConnection).HasMaxLength(ListingSuggestion.ChurchConnectionMaxLength);
        builder.Property(s => s.Reason).HasMaxLength(ListingSuggestion.ReasonMaxLength);
        builder.Property(s => s.ContactEmail).HasMaxLength(ListingSuggestion.ContactEmailMaxLength);
        builder.HasOne<Domain.Members.Member>().WithMany().HasForeignKey(s => s.SuggestedById).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(s => new { s.SuggestedById, s.SubmittedAt });
        builder.HasIndex(s => new { s.Status, s.SubmittedAt });
    }
}
