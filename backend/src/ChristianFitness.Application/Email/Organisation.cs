namespace ChristianFitness.Application.Email;

/// <summary>
/// Who sends the newsletter (<c>Organisation:PostalAddress</c>; ADR 0110): every newsletter email's
/// footer names Christian Fitness and this postal address (L2-058 AC4), as Canada's anti-spam law
/// asks. It comes from configuration and is required outside development.
/// </summary>
public sealed class Organisation(string postalAddress)
{
    public const string Name = "Christian Fitness";

    public string PostalAddress { get; } = postalAddress;
}
