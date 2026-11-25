using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// An event (ADR 0021). The category and status are stored by name, so a reordered enum never
/// changes what a row means; the staff list reads a status's events by their start.
/// </summary>
internal sealed class EventConfiguration : IEntityTypeConfiguration<Event>
{
    public void Configure(EntityTypeBuilder<Event> builder)
    {
        builder.ToTable("Events");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedNever();
        builder.Property(e => e.RegistrationVersion).IsConcurrencyToken();
        builder.Property(e => e.Title).HasMaxLength(Event.TitleMaxLength).IsRequired();
        builder.Property(e => e.Category).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(e => e.Place).HasMaxLength(Event.PlaceMaxLength).IsRequired();
        builder.Property(e => e.Area).HasMaxLength(Event.AreaMaxLength).IsRequired();
        builder.Property(e => e.Summary).HasMaxLength(Event.SummaryMaxLength).IsRequired();
        builder.Property(e => e.ImageKey).HasMaxLength(Event.ImageKeyMaxLength);
        builder.Property(e => e.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        // Every event has a host; the team listing is the database's default too, so an older revision
        // inserting an event without one during a rollout still gets a host (ADR 0067, ADR 0082).
        builder.Property(e => e.HostListingId).HasDefaultValue(DirectoryListing.TeamListingId);
        builder.HasOne<DirectoryListing>().WithMany().HasForeignKey(e => e.HostListingId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(e => new { e.HostListingId, e.Status, e.StartsAt });
        builder.HasIndex(e => new { e.Status, e.StartsAt });
        builder.HasIndex(e => e.StartsAt);
    }
}
