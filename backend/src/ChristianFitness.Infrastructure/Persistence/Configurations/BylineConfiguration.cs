using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.News;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// A byline (ADR 0094): its lower-cased name key is unique, so two bylines can never share a name
/// in any case, and orders the list.
/// </summary>
internal sealed class BylineConfiguration : IEntityTypeConfiguration<Byline>
{
    public void Configure(EntityTypeBuilder<Byline> builder)
    {
        builder.ToTable("Bylines");
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).ValueGeneratedNever();
        builder.Property(b => b.Name).HasMaxLength(Byline.NameMaxLength).IsRequired();
        builder.Property(b => b.NameKey).HasMaxLength(Byline.NameMaxLength).IsRequired();
        builder.Property(b => b.Bio).HasMaxLength(Byline.BioMaxLength).IsRequired();
        builder.Property(b => b.PhotoKey).HasMaxLength(Event.ImageKeyMaxLength);
        builder.HasIndex(b => b.NameKey).IsUnique();
    }
}

/// <summary>
/// A story, as far as journey 21 needs one (ADR 0094): its byline is a required foreign key the
/// database will not let go, so no story ever loses its byline (L2-077 AC7).
/// </summary>
internal sealed class StoryConfiguration : IEntityTypeConfiguration<Story>
{
    /// <summary>The longest headline kept, until the story editor sets its own limit (issue 172).</summary>
    private const int HeadlineMaxLength = 200;

    public void Configure(EntityTypeBuilder<Story> builder)
    {
        builder.ToTable("Stories");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedNever();
        builder.Property(s => s.Headline).HasMaxLength(HeadlineMaxLength).IsRequired();
        builder.HasOne<Byline>().WithMany().HasForeignKey(s => s.BylineId).OnDelete(DeleteBehavior.Restrict);
    }
}
