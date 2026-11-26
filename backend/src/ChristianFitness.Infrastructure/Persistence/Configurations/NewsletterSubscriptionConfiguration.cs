using ChristianFitness.Domain.Newsletter;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

internal sealed class NewsletterSubscriptionConfiguration : IEntityTypeConfiguration<NewsletterSubscription>
{
    public void Configure(EntityTypeBuilder<NewsletterSubscription> builder)
    {
        builder.ToTable("NewsletterSubscriptions");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedNever();
        builder.Property(s => s.Email).HasMaxLength(NewsletterSubscription.EmailMaxLength).IsRequired();
        builder.Property(s => s.Status).HasConversion<string>().HasMaxLength(16);
        builder.Property(s => s.ConsentSource).HasMaxLength(64);
        // One subscription per address; the purge reads each status by its time (ADR 0110).
        builder.HasIndex(s => s.Email).IsUnique();
        builder.HasIndex(s => new { s.Status, s.RequestedAt });
        builder.HasIndex(s => new { s.Status, s.UnsubscribedAt });
    }
}

internal sealed class NewsletterIssueConfiguration : IEntityTypeConfiguration<NewsletterIssue>
{
    public void Configure(EntityTypeBuilder<NewsletterIssue> builder)
    {
        builder.ToTable("NewsletterIssues");
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).ValueGeneratedNever();
        builder.Property(i => i.Status).HasConversion<string>().HasMaxLength(16);
        builder.HasIndex(i => i.Number).IsUnique();
    }
}

internal sealed class SubscriptionConfirmationConfiguration : IEntityTypeConfiguration<SubscriptionConfirmation>
{
    public void Configure(EntityTypeBuilder<SubscriptionConfirmation> builder)
    {
        builder.ToTable("SubscriptionConfirmations");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedNever();
        builder.Property(c => c.TokenHash).HasMaxLength(64).IsRequired();
        builder.HasIndex(c => c.TokenHash).IsUnique();
        builder.HasIndex(c => c.SubscriptionId);
        builder.HasOne<NewsletterSubscription>().WithMany().HasForeignKey(c => c.SubscriptionId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class NewsletterUnsubscribeTokenConfiguration : IEntityTypeConfiguration<NewsletterUnsubscribeToken>
{
    public void Configure(EntityTypeBuilder<NewsletterUnsubscribeToken> builder)
    {
        builder.ToTable("NewsletterUnsubscribeTokens");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedNever();
        builder.Property(t => t.TokenHash).HasMaxLength(64).IsRequired();
        builder.HasIndex(t => t.TokenHash).IsUnique();
        builder.HasIndex(t => t.SubscriptionId);
        builder.HasOne<NewsletterSubscription>().WithMany().HasForeignKey(t => t.SubscriptionId).OnDelete(DeleteBehavior.Cascade);
    }
}
