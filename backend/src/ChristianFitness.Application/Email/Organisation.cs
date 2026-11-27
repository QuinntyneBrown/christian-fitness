namespace ChristianFitness.Application.Email;

/// <summary>
/// Who sends the newsletter (<c>Organisation:PostalAddress</c>; ADR 0110): every newsletter email's
/// footer names Christian Fitness and this postal address (L2-058 AC4), as Canada's anti-spam law
/// asks. It comes from configuration and is required outside development.
/// </summary>
public sealed class Organisation(string postalAddress)
{
    public const string Name = "Christian Fitness";

    /// <summary>Where members write about their personal data, as the Privacy Policy names it (L2-067).</summary>
    public const string PrivacyEmail = "privacy@christian.fitness";

    public string PostalAddress { get; } = postalAddress;
}
