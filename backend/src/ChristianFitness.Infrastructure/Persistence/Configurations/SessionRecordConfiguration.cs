using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

internal sealed class SessionRecordConfiguration : IEntityTypeConfiguration<SessionRecord>
{
    public void Configure(EntityTypeBuilder<SessionRecord> builder)
    {
        builder.ToTable("Sessions");
        builder.HasKey(session => session.Id);
        builder.Property(session => session.Id).HasMaxLength(32).ValueGeneratedNever();
        builder.Property(session => session.Ticket).IsRequired();
        builder.HasIndex(session => session.MemberId);
        builder.HasOne<Domain.Members.Member>().WithMany().HasForeignKey(session => session.MemberId).OnDelete(DeleteBehavior.Cascade);
    }
}
