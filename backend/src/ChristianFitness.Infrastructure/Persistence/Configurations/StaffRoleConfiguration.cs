using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

internal sealed class StaffRoleConfiguration : IEntityTypeConfiguration<StaffRole>
{
    public void Configure(EntityTypeBuilder<StaffRole> builder)
    {
        builder.HasKey(role => role.MemberId);
        builder.Property(role => role.Name).HasConversion<string>().HasMaxLength(16);
        builder.HasOne<Member>().WithOne().HasForeignKey<StaffRole>(role => role.MemberId).OnDelete(DeleteBehavior.Cascade);
    }
}
