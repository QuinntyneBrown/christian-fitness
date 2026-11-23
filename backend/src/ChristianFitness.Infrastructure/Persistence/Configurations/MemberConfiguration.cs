using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

internal sealed class MemberConfiguration : IEntityTypeConfiguration<Member>
{
    public void Configure(EntityTypeBuilder<Member> builder)
    {
        builder.HasKey(member => member.Id);
        builder.Property(member => member.Id).ValueGeneratedNever();
        builder.Property(member => member.Name).HasMaxLength(Member.NameMaxLength).IsRequired();
        builder.Property(member => member.Email).HasMaxLength(Member.EmailMaxLength).IsRequired();
        builder.Property(member => member.NormalizedEmail).HasMaxLength(Member.EmailMaxLength).IsRequired();
        builder.HasIndex(member => member.NormalizedEmail).IsUnique();
        builder.Property(member => member.PasswordHash).IsRequired();
        builder.Property(member => member.HomeChurch).HasMaxLength(Member.HomeChurchMaxLength);
        builder.PrimitiveCollection(member => member.Interests).IsRequired();
        builder.Property(member => member.City).HasMaxLength(Member.CityMaxLength);
        builder.Property(member => member.Bio).HasMaxLength(Member.BioMaxLength);
        builder.PrimitiveCollection(member => member.Goals).IsRequired();
        builder.Property(member => member.Status).HasConversion<string>().HasMaxLength(16);
        builder.Property(member => member.ModerationNote).HasMaxLength(Member.ModerationNoteMaxLength);
    }
}
