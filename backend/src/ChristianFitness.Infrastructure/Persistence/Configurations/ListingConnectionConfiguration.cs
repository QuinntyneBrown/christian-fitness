using ChristianFitness.Domain.Directory;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// A listing's relation to another (ADR 0085): one row per direction and pair, read from the
/// listing whose profile shows it. Both listings cascade, so removing a listing's row removes its
/// connections either way.
/// </summary>
internal sealed class ListingConnectionConfiguration : IEntityTypeConfiguration<ListingConnection>
{
    public void Configure(EntityTypeBuilder<ListingConnection> builder)
    {
        builder.ToTable("ListingConnections");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedNever();
        builder.Property(c => c.Relation).HasMaxLength(ListingConnection.RelationMaxLength).IsRequired();
        builder.HasIndex(c => new { c.ListingId, c.ConnectedListingId }).IsUnique();
        builder.HasIndex(c => c.ConnectedListingId);
        builder.HasOne<DirectoryListing>().WithMany().HasForeignKey(c => c.ListingId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<DirectoryListing>().WithMany().HasForeignKey(c => c.ConnectedListingId).OnDelete(DeleteBehavior.Cascade);
    }
}
