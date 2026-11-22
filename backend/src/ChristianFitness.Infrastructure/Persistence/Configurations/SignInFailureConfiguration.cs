using ChristianFitness.Domain.Sessions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

internal sealed class SignInFailureConfiguration : IEntityTypeConfiguration<SignInFailure>
{
    public void Configure(EntityTypeBuilder<SignInFailure> builder)
    {
        builder.ToTable("SignInFailures");
        builder.HasKey(failure => failure.Id);
        builder.Property(failure => failure.Id).ValueGeneratedNever();
        builder.Property(failure => failure.EmailKey).HasMaxLength(SignInFailure.EmailKeyLength).IsFixedLength().IsRequired();
        // Counting an email's recent failures reads by key and time; pruning reads by time alone.
        builder.HasIndex(failure => new { failure.EmailKey, failure.FailedAt });
        builder.HasIndex(failure => failure.FailedAt);
    }
}
