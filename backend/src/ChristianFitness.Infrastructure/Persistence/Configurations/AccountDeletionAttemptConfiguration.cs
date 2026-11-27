using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>
/// A member's presses of "Delete my account" (ADR 0118), counted by member and time against the
/// hourly limit. Gone with the member.
/// </summary>
internal sealed class AccountDeletionAttemptConfiguration : IEntityTypeConfiguration<AccountDeletionAttempt>
{
    public void Configure(EntityTypeBuilder<AccountDeletionAttempt> builder)
    {
        builder.ToTable("AccountDeletionAttempts");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedNever();
        builder.HasOne<Member>().WithMany().HasForeignKey(a => a.MemberId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(a => new { a.MemberId, a.AttemptedAt });
    }
}
