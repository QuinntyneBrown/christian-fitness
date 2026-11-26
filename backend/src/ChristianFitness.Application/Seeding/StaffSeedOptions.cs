namespace ChristianFitness.Application.Seeding;

/// <summary>
/// The first Admin, from the <c>Seed__Admin*</c> settings; never from source (L2-049 AC15; ADR
/// 0100). <see cref="Email"/> is the Admin's Google Workspace account; <see cref="Name"/> is
/// optional.
/// </summary>
public sealed record StaffSeedOptions(string Email, string? Name)
{
    /// <summary>The name shown until the Admin changes it, when no <c>Seed__AdminName</c> is set.</summary>
    public const string DefaultName = "Christian Fitness Admin";

    /// <summary>The Admin's display name: <see cref="Name"/>, or <see cref="DefaultName"/> when blank.</summary>
    public string DisplayName => string.IsNullOrWhiteSpace(Name) ? DefaultName : Name.Trim();

    /// <summary>The settings that are missing or blank, by their environment-variable names.</summary>
    public IEnumerable<string> MissingSettings()
    {
        if (string.IsNullOrWhiteSpace(Email))
        {
            yield return "Seed__AdminEmail";
        }
    }
}
