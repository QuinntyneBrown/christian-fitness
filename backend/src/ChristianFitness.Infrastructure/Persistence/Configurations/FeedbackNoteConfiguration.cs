using ChristianFitness.Domain.Feedback;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// A member's feedback note (ADR 0109). Kind and status are stored by name. The hourly limit counts
/// a member's notes since a time; the staff inbox reads them by status, newest first.
/// </summary>
internal sealed class FeedbackNoteConfiguration : IEntityTypeConfiguration<FeedbackNote>
{
    public void Configure(EntityTypeBuilder<FeedbackNote> builder)
    {
        builder.ToTable("FeedbackNotes");
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Id).ValueGeneratedNever();
        builder.Property(n => n.Kind).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(n => n.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(n => n.Text).HasMaxLength(FeedbackNote.TextMaxLength).IsRequired();
        builder.Property(n => n.PageRouteTemplate).HasMaxLength(FeedbackNote.RouteTemplateMaxLength);
        builder.Property(n => n.PageTitle).HasMaxLength(FeedbackNote.PageTitleMaxLength);
        builder.Property(n => n.Device).HasMaxLength(FeedbackNote.DeviceMaxLength).IsRequired();
        builder.Property(n => n.Browser).HasMaxLength(FeedbackNote.DeviceMaxLength).IsRequired();
        builder.Property(n => n.ScreenshotKey).HasMaxLength(FeedbackNote.ScreenshotKeyMaxLength);
        builder.HasOne<Domain.Members.Member>().WithMany().HasForeignKey(n => n.MemberId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(n => new { n.MemberId, n.SentAt });
        builder.HasIndex(n => new { n.Status, n.SentAt });
    }
}

internal sealed class FeedbackReplyConfiguration : IEntityTypeConfiguration<FeedbackReply>
{
    public void Configure(EntityTypeBuilder<FeedbackReply> builder)
    {
        builder.ToTable("FeedbackReplies");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.Text).HasMaxLength(FeedbackReply.TextMaxLength).IsRequired();
        builder.HasIndex(r => new { r.NoteId, r.SentAt });
        // A reply goes with its note, and so with the member who sent the note (L2-074 AC5).
        builder.HasOne<FeedbackNote>().WithMany().HasForeignKey(r => r.NoteId).OnDelete(DeleteBehavior.Cascade);
    }
}
