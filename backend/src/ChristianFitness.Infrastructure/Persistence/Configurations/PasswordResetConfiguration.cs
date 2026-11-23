using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

internal sealed class PasswordResetConfiguration : IEntityTypeConfiguration<PasswordReset>
{
    public void Configure(EntityTypeBuilder<PasswordReset> builder)
    {
        builder.ToTable("PasswordResets");
        builder.HasKey(reset => reset.Id);
        builder.Property(reset => reset.Id).ValueGeneratedNever();
        builder.Property(reset => reset.TokenHash).HasMaxLength(64).IsRequired();
        // A link is spent once: the database updates a reset only while it is still unused, so the
        // second of two saves with one link fails (L2-045 AC7; ADR 0013).
        builder.Property(reset => reset.UsedAt).IsConcurrencyToken();
        // A link finds its reset by the hash; the window counts a member's recent resets.
        builder.HasIndex(reset => reset.TokenHash).IsUnique();
        builder.HasIndex(reset => new { reset.MemberId, reset.RequestedAt });
        builder.HasOne<Member>().WithMany().HasForeignKey(reset => reset.MemberId).OnDelete(DeleteBehavior.Cascade);
    }
}
