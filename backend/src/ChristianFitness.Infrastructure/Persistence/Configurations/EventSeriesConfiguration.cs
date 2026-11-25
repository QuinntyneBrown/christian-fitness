using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// A series of dated sessions (ADR 0080, ADR 0091). Its texts take the limits of an event's, since
/// each session copies them; the category is stored by name, as an event's is.
/// </summary>
internal sealed class EventSeriesConfiguration : IEntityTypeConfiguration<EventSeries>
{
    public void Configure(EntityTypeBuilder<EventSeries> builder)
    {
        builder.ToTable("EventSeries");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedNever();
        builder.Property(s => s.Title).HasMaxLength(Event.TitleMaxLength).IsRequired();
        builder.Property(s => s.Category).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(s => s.Summary).HasMaxLength(Event.SummaryMaxLength).IsRequired();
        builder.Property(s => s.ImageKey).HasMaxLength(Event.ImageKeyMaxLength);
        builder.Property(s => s.Place).HasMaxLength(Event.PlaceMaxLength).IsRequired();
        builder.Property(s => s.Area).HasMaxLength(Event.AreaMaxLength).IsRequired();
        builder.HasOne<DirectoryListing>().WithMany().HasForeignKey(s => s.HostListingId).OnDelete(DeleteBehavior.Restrict);
        builder.Ignore(s => s.SessionPriceCents);
        builder.Property(s => s.EnrolmentVersion).IsConcurrencyToken();
    }
}

/// <summary>One member's place in a series, unique per pair (ADR 0091).</summary>
internal sealed class SeriesEnrolmentConfiguration : IEntityTypeConfiguration<SeriesEnrolment>
{
    public void Configure(EntityTypeBuilder<SeriesEnrolment> builder)
    {
        builder.ToTable("SeriesEnrolments");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedNever();
        builder.Property(e => e.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.HasOne<EventSeries>().WithMany().HasForeignKey(e => e.SeriesId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(e => new { e.SeriesId, e.MemberId }).IsUnique();
    }
}
