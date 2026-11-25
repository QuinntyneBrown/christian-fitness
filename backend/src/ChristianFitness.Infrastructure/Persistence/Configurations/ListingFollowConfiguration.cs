using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// A member's follow of a listing (ADR 0088), keyed by the pair so a second insert of the same
/// pair is a unique-key conflict. The listing index serves the follower count; removing either the
/// member or the listing removes the follow.
/// </summary>
internal sealed class ListingFollowConfiguration : IEntityTypeConfiguration<ListingFollow>
{
    public void Configure(EntityTypeBuilder<ListingFollow> builder)
    {
        builder.ToTable("ListingFollows");
        builder.HasKey(f => new { f.MemberId, f.ListingId });
        builder.HasIndex(f => f.ListingId);
        builder.HasOne<Member>().WithMany().HasForeignKey(f => f.MemberId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<DirectoryListing>().WithMany().HasForeignKey(f => f.ListingId).OnDelete(DeleteBehavior.Cascade);
    }
}
