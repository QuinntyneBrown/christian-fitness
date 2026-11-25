using ChristianFitness.Domain.Directory;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>A claim link (ADR 0090): found by its token's hash, deleted with its listing.</summary>
internal sealed class ListingClaimConfiguration : IEntityTypeConfiguration<ListingClaim>
{
    public void Configure(EntityTypeBuilder<ListingClaim> builder)
    {
        builder.ToTable("ListingClaims");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedNever();
        builder.Property(c => c.TokenHash).HasMaxLength(64).IsRequired();
        builder.HasIndex(c => c.TokenHash).IsUnique();
        builder.HasOne<DirectoryListing>().WithMany().HasForeignKey(c => c.ListingId).OnDelete(DeleteBehavior.Cascade);
    }
}
