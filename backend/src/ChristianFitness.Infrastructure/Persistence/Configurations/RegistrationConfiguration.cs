using ChristianFitness.Domain.Events;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>A registration (ADR 0032): one per member and event, the status stored by name.</summary>
internal sealed class RegistrationConfiguration : IEntityTypeConfiguration<Registration>
{
    public void Configure(EntityTypeBuilder<Registration> builder)
    {
        builder.ToTable("Registrations");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.HasIndex(r => new { r.EventId, r.MemberId }).IsUnique();
        builder.HasIndex(r => new { r.MemberId, r.CreatedAt });
    }
}

/// <summary>Whether a member came to an event (ADR 0106): one per member and event, removed with the event.</summary>
internal sealed class AttendanceConfiguration : IEntityTypeConfiguration<Attendance>
{
    public void Configure(EntityTypeBuilder<Attendance> builder)
    {
        builder.ToTable("Attendances");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedNever();
        builder.HasOne<Event>().WithMany().HasForeignKey(a => a.EventId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(a => new { a.EventId, a.MemberId }).IsUnique();
        builder.HasIndex(a => new { a.MemberId, a.EventId });
    }
}
