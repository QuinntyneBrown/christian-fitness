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
        // Slice 20.2 finds a reset by its hash; the window counts a member's recent resets.
        builder.HasIndex(reset => reset.TokenHash).IsUnique();
        builder.HasIndex(reset => new { reset.MemberId, reset.RequestedAt });
        builder.HasOne<Member>().WithMany().HasForeignKey(reset => reset.MemberId).OnDelete(DeleteBehavior.Cascade);
    }
}
