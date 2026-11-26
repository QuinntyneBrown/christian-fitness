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
/// A story (ADR 0094, ADR 0097): its byline is a foreign key the database will not let go, so no
/// story ever loses its byline (L2-077 AC7); its link is unique among stories, and its former links
/// are kept beside it; <see cref="Story.Version"/> is the concurrency token, so two editors cannot
/// both save over one version (L2-069 AC12). Enums are stored by name.
/// </summary>
internal sealed class StoryConfiguration : IEntityTypeConfiguration<Story>
{
    public void Configure(EntityTypeBuilder<Story> builder)
    {
        builder.ToTable("Stories");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedNever();
        builder.Property(s => s.Status).HasConversion<string>().HasMaxLength(16);
        builder.Property(s => s.Section).HasConversion<string>().HasMaxLength(16);
        builder.Property(s => s.Placement).HasConversion<string>().HasMaxLength(16);
        builder.Property(s => s.PointsTo).HasConversion<string>().HasMaxLength(16);
        builder.Property(s => s.Headline).HasMaxLength(Story.HeadlineMaxLength).IsRequired();
        builder.Property(s => s.Summary).HasMaxLength(Story.SummaryMaxLength).IsRequired();
        builder.Property(s => s.Text).HasMaxLength(Story.TextMaxLength).IsRequired();
        builder.Property(s => s.NextStepText).HasMaxLength(Story.NextStepTextMaxLength);
        builder.Property(s => s.NextStepLink).HasMaxLength(Story.NextStepLinkMaxLength);
        builder.Property(s => s.Slug).HasMaxLength(Story.SlugMaxLength);
        builder.HasIndex(s => s.Slug).IsUnique();
        builder.PrimitiveCollection(s => s.FormerSlugs).IsRequired();
        builder.Property(s => s.ImageKey).HasMaxLength(Event.ImageKeyMaxLength);
        builder.OwnsOne(s => s.ImageCrop);
        builder.Property(s => s.Version).IsConcurrencyToken();
        builder.HasIndex(s => new { s.Status, s.ActivityAt });
        builder.HasOne<Byline>().WithMany().HasForeignKey(s => s.BylineId).OnDelete(DeleteBehavior.Restrict);
    }
}
