using ChristianFitness.Domain.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>A stored professional application (ADR 0047): looked up by member and status.</summary>
internal sealed class ProfessionalApplicationConfiguration : IEntityTypeConfiguration<ProfessionalApplication>
{
    public void Configure(EntityTypeBuilder<ProfessionalApplication> builder)
    {
        builder.ToTable("ProfessionalApplications");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedNever();
        builder.Property(a => a.Role).HasMaxLength(ProfessionalApplication.RoleMaxLength).IsRequired();
        builder.Property(a => a.Category).HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.Credentials).HasMaxLength(ProfessionalApplication.CredentialsMaxLength).IsRequired();
        builder.Property(a => a.Where).HasMaxLength(ProfessionalApplication.WhereMaxLength).IsRequired();
        builder.Property(a => a.Price).HasMaxLength(ProfessionalApplication.PriceMaxLength).IsRequired();
        builder.Property(a => a.About).HasMaxLength(ProfessionalApplication.AboutMaxLength).IsRequired();
        builder.Property(a => a.DeclineReason).HasMaxLength(ProfessionalApplication.DeclineReasonMaxLength);
        builder.Property(a => a.Status).HasConversion<string>().HasMaxLength(20);
        builder.HasIndex(a => new { a.MemberId, a.Status });
    }
}
