using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianFitness.Infrastructure.Persistence.Configurations;

/// <summary>A staff account's authenticator: one per account, gone with the account (ADR 0012).</summary>
internal sealed class StaffTwoStepConfiguration : IEntityTypeConfiguration<StaffTwoStep>
{
    public void Configure(EntityTypeBuilder<StaffTwoStep> builder)
    {
        builder.ToTable("StaffTwoSteps");
        builder.HasKey(twoStep => twoStep.MemberId);
        builder.Property(twoStep => twoStep.MemberId).ValueGeneratedNever();
        builder.Property(twoStep => twoStep.Secret).HasMaxLength(64).IsRequired();
        builder.HasOne<Member>().WithOne().HasForeignKey<StaffTwoStep>(twoStep => twoStep.MemberId).OnDelete(DeleteBehavior.Cascade);
    }
}

/// <summary>A pending admin sign-in, found by its token's hash (ADR 0012).</summary>
internal sealed class TwoStepChallengeConfiguration : IEntityTypeConfiguration<TwoStepChallenge>
{
    public void Configure(EntityTypeBuilder<TwoStepChallenge> builder)
    {
        builder.ToTable("TwoStepChallenges");
        builder.HasKey(challenge => challenge.Id);
        builder.Property(challenge => challenge.Id).ValueGeneratedNever();
        builder.Property(challenge => challenge.TokenHash).HasMaxLength(64).IsRequired();
        builder.HasIndex(challenge => challenge.TokenHash).IsUnique();
        builder.HasIndex(challenge => challenge.MemberId);
        builder.HasOne<Member>().WithMany().HasForeignKey(challenge => challenge.MemberId).OnDelete(DeleteBehavior.Cascade);
    }
}

/// <summary>A wrong second-step code; the window counts an account's recent ones (ADR 0012).</summary>
internal sealed class TwoStepFailureConfiguration : IEntityTypeConfiguration<TwoStepFailure>
{
    public void Configure(EntityTypeBuilder<TwoStepFailure> builder)
    {
        builder.ToTable("TwoStepFailures");
        builder.HasKey(failure => failure.Id);
        builder.Property(failure => failure.Id).ValueGeneratedNever();
        builder.HasIndex(failure => new { failure.MemberId, failure.FailedAt });
        builder.HasOne<Member>().WithMany().HasForeignKey(failure => failure.MemberId).OnDelete(DeleteBehavior.Cascade);
    }
}
