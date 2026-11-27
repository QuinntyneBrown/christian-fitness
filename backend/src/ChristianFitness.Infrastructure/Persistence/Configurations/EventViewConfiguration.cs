using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// A member's first opening of an event (ADR 0116), keyed by the pair. Removing either the member or
/// the event removes it.
/// </summary>
internal sealed class EventViewConfiguration : IEntityTypeConfiguration<EventView>
{
    public void Configure(EntityTypeBuilder<EventView> builder)
    {
        builder.ToTable("EventViews");
        builder.HasKey(v => new { v.MemberId, v.EventId });
        builder.HasOne<Member>().WithMany().HasForeignKey(v => v.MemberId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Event>().WithMany().HasForeignKey(v => v.EventId).OnDelete(DeleteBehavior.Cascade);
    }
}
