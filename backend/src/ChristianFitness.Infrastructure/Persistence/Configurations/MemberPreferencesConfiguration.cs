using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

internal sealed class MemberPreferencesConfiguration : IEntityTypeConfiguration<MemberPreferences>
{
    public void Configure(EntityTypeBuilder<MemberPreferences> builder)
    {
        builder.ToTable("MemberPreferences");
        builder.HasKey(p => p.MemberId);
        builder.Property(p => p.MemberId).ValueGeneratedNever();
        builder.Property(p => p.Visibility).HasConversion<string>().HasMaxLength(16);
        builder.Property(p => p.Area).HasMaxLength(32);
        // One row per member, gone with the member (L2-064).
        builder.HasOne<Member>().WithOne().HasForeignKey<MemberPreferences>(p => p.MemberId).OnDelete(DeleteBehavior.Cascade);
    }
}
