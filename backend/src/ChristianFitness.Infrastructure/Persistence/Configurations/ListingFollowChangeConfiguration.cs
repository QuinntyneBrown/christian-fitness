using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// The log of a member's follows and unfollows of the last hour (ADR 0088), read and pruned by
/// member and time; removing the member removes it.
/// </summary>
internal sealed class ListingFollowChangeConfiguration : IEntityTypeConfiguration<ListingFollowChange>
{
    public void Configure(EntityTypeBuilder<ListingFollowChange> builder)
    {
        builder.ToTable("ListingFollowChanges");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedNever();
        builder.HasIndex(c => new { c.MemberId, c.ChangedAt });
        builder.HasOne<Member>().WithMany().HasForeignKey(c => c.MemberId).OnDelete(DeleteBehavior.Cascade);
    }
}
