using ChristianFitness.Application.Seeding;

namespace ChristianFitness.Application.Tests.Seeding;

/// <summary>Staff credentials come from configuration; each missing setting is named (docs/operations/settings.md).</summary>
public sealed class StaffSeedOptionsTests
{
    [Theory]
    [InlineData("admin@example.org", "first-Password-1", "Community Admin", "")]
    [InlineData(null, "first-Password-1", "Community Admin", "Seed__StaffEmail")]
    [InlineData("admin@example.org", " ", "Community Admin", "Seed__StaffPassword")]
    [InlineData("admin@example.org", "first-Password-1", "", "Seed__StaffName")]
    [InlineData(null, null, null, "Seed__StaffEmail, Seed__StaffPassword, Seed__StaffName")]
    public void Given_the_seed_settings_When_checked_Then_each_missing_one_is_named(string? email, string? password, string? name, string missing)
    {
        var options = new StaffSeedOptions(email!, password!, name!);

        Assert.Equal(missing, string.Join(", ", options.MissingSettings()));
    }
}
