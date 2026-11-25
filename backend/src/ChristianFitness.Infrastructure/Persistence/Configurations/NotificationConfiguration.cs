using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>A member's notification (ADR 0083): read by member, newest first; gone with the member.</summary>
internal sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("Notifications");
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Id).ValueGeneratedNever();
        builder.Property(n => n.Kind).HasConversion<string>().HasMaxLength(32);
        builder.Property(n => n.Title).HasMaxLength(Notification.TitleMaxLength).IsRequired();
        builder.Property(n => n.Text).HasMaxLength(Notification.TextMaxLength).IsRequired();
        builder.Property(n => n.Href).HasMaxLength(Notification.HrefMaxLength).IsRequired();
        builder.HasOne<Member>().WithMany().HasForeignKey(n => n.MemberId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(n => new { n.MemberId, n.CreatedAt });
    }
}
