using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>A stored published listing (ADR 0049): one per approved application, browsed by category.</summary>
internal sealed class ServiceListingConfiguration : IEntityTypeConfiguration<ServiceListing>
{
    public void Configure(EntityTypeBuilder<ServiceListing> builder)
    {
        builder.ToTable("ServiceListings");
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).ValueGeneratedNever();
        builder.Property(l => l.Name).HasMaxLength(Member.NameMaxLength).IsRequired();
        builder.Property(l => l.Role).HasMaxLength(ProfessionalApplication.RoleMaxLength).IsRequired();
        builder.Property(l => l.Category).HasConversion<string>().HasMaxLength(20);
        builder.Property(l => l.Credentials).HasMaxLength(ProfessionalApplication.CredentialsMaxLength).IsRequired();
        builder.Property(l => l.Where).HasMaxLength(ProfessionalApplication.WhereMaxLength).IsRequired();
        builder.Property(l => l.Price).HasMaxLength(ProfessionalApplication.PriceMaxLength).IsRequired();
        builder.Property(l => l.About).HasMaxLength(ProfessionalApplication.AboutMaxLength).IsRequired();
        builder.Property(l => l.ContactUrl).HasMaxLength(ServiceListing.ContactUrlMaxLength);
        builder.HasIndex(l => l.ApplicationId).IsUnique();
        builder.HasIndex(l => new { l.Category, l.PublishedAt });
    }
}
