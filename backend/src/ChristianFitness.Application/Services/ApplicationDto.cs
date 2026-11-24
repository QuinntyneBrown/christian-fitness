using ChristianFitness.Domain.Services;

namespace ChristianFitness.Application.Services;

/// <summary>A professional application as the member sees it after sending it (L2-026 AC1).</summary>
public sealed record ApplicationDto(
    Guid Id, string Role, string Category, string Credentials, string Where, string Price, string About, string Status, DateTimeOffset SubmittedAt)
{
    public static ApplicationDto Of(ProfessionalApplication application)
    {
        ArgumentNullException.ThrowIfNull(application);
        return new ApplicationDto(
            application.Id, application.Role, application.Category.ToString(), application.Credentials, application.Where,
            application.Price, application.About, application.Status.ToString().ToLowerInvariant(), application.SubmittedAt);
    }
}
