namespace ChristianFitness.Application.Seeding;

/// <summary>The first staff account, from the <c>Seed__Staff*</c> settings; never from source.</summary>
public sealed record StaffSeedOptions(string Email, string Password, string Name)
{
    /// <summary>The settings that are missing or blank, by their environment-variable names.</summary>
    public IEnumerable<string> MissingSettings()
    {
        if (string.IsNullOrWhiteSpace(Email))
        {
            yield return "Seed__StaffEmail";
        }

        if (string.IsNullOrWhiteSpace(Password))
        {
            yield return "Seed__StaffPassword";
        }

        if (string.IsNullOrWhiteSpace(Name))
        {
            yield return "Seed__StaffName";
        }
    }
}
