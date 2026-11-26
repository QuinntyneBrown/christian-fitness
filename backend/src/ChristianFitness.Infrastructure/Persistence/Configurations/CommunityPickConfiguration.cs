using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// A Community Pick (ADR 0098): its event and the staff member who made it are foreign keys the
/// database keeps, and picks are found by event, latest first, for "Last picked".
/// </summary>
internal sealed class CommunityPickConfiguration : IEntityTypeConfiguration<CommunityPick>
{
    public void Configure(EntityTypeBuilder<CommunityPick> builder)
    {
        builder.ToTable("CommunityPicks");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).ValueGeneratedNever();
        builder.Property(p => p.Note).HasMaxLength(CommunityPick.NoteMaxLength).IsRequired();
        builder.HasOne<Event>().WithMany().HasForeignKey(p => p.EventId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Member>().WithMany().HasForeignKey(p => p.PickedById).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(p => new { p.EventId, p.PickedAt });
    }
}
