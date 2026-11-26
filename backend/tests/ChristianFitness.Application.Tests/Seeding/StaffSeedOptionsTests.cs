using ChristianFitness.Application.Seeding;

namespace ChristianFitness.Application.Tests.Seeding;

/// <summary>
/// The first Admin comes from configuration (L2-049 AC15; ADR 0100): <c>Seed__AdminEmail</c> is
/// required and named when missing; <c>Seed__AdminName</c> is optional, with a default.
/// </summary>
public sealed class StaffSeedOptionsTests
{
    [Theory]
    [InlineData("admin@christian.fitness", "")]
    [InlineData(null, "Seed__AdminEmail")]
    [InlineData(" ", "Seed__AdminEmail")]
    public void Given_the_seed_settings_When_checked_Then_a_missing_admin_email_is_named(string? email, string missing)
    {
        var options = new StaffSeedOptions(email!, null);

        Assert.Equal(missing, string.Join(", ", options.MissingSettings()));
    }

    [Theory]
    [InlineData(null, "Christian Fitness Admin")]
    [InlineData("  ", "Christian Fitness Admin")]
    [InlineData("Community Admin", "Community Admin")]
    public void Given_an_admin_name_or_none_When_read_Then_the_display_name_is_it_or_the_default(string? name, string expected)
    {
        var options = new StaffSeedOptions("admin@christian.fitness", name);

        Assert.Equal(expected, options.DisplayName);
    }
}
