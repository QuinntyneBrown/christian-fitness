using ChristianFitness.Domain.Directory;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// A directory listing (ADR 0082). Kind and status are stored by name. The directory reads the
/// published listings by kind and folded name, and a search matches the folded text through a
/// trigram GIN index (<c>pg_trgm</c>), which PostgreSQL uses for a "contains" (<c>LIKE '%q%'</c>).
/// </summary>
internal sealed class DirectoryListingConfiguration : IEntityTypeConfiguration<DirectoryListing>
{
    public void Configure(EntityTypeBuilder<DirectoryListing> builder)
    {
        builder.ToTable("DirectoryListings");
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).ValueGeneratedNever();
        builder.Property(l => l.Kind).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(l => l.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(l => l.Name).HasMaxLength(DirectoryListing.NameMaxLength).IsRequired();
        builder.Property(l => l.Tagline).HasMaxLength(DirectoryListing.TaglineMaxLength).IsRequired();
        builder.Property(l => l.Area).HasMaxLength(DirectoryListing.AreaMaxLength).IsRequired();
        builder.Property(l => l.Description).HasMaxLength(DirectoryListing.DescriptionMaxLength).IsRequired();
        builder.PrimitiveCollection(l => l.Focus).IsRequired();
        builder.Property(l => l.WebsiteUrl).HasMaxLength(DirectoryListing.WebsiteMaxLength);
        builder.Property(l => l.PhotoKey).HasMaxLength(DirectoryListing.PhotoKeyMaxLength);
        builder.Property(l => l.ContactEmail).HasMaxLength(DirectoryListing.ContactEmailMaxLength);
        builder.Property(l => l.PendingName).HasMaxLength(DirectoryListing.NameMaxLength);
        builder.Property(l => l.PendingKind).HasConversion<string>().HasMaxLength(20);
        builder.Property(l => l.NameKey).HasMaxLength(DirectoryListing.NameMaxLength).IsRequired();
        builder.Property(l => l.SearchText).HasMaxLength(DirectoryListing.SearchTextMaxLength).IsRequired();
        builder.HasIndex(l => new { l.Status, l.KindOrder, l.NameKey, l.Id });
        builder.HasIndex(l => l.SearchText).HasMethod("gin").HasOperators("gin_trgm_ops");
    }
}
