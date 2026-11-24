namespace ChristianFitness.Domain.Services;

/// <summary>
/// A professional published on Services (L2-025 AC2; L2-027; ADR 0049): what the approved
/// application said, with the applicant's name as it was when staff approved. Members browse these
/// in slice 16.1; staff edit and remove them in slice 23.
/// </summary>
public sealed class ServiceListing
{
    private ServiceListing()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The application staff approved to publish it.</summary>
    public Guid ApplicationId { get; private set; }

    public Guid MemberId { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public string Role { get; private set; } = string.Empty;

    public ServiceCategory Category { get; private set; }

    public string Credentials { get; private set; } = string.Empty;

    public string Where { get; private set; } = string.Empty;

    public string Price { get; private set; } = string.Empty;

    public string About { get; private set; } = string.Empty;

    public DateTimeOffset PublishedAt { get; private set; }

    internal static ServiceListing Publish(ProfessionalApplication application, string name, DateTimeOffset publishedAt)
    {
        ArgumentNullException.ThrowIfNull(application);
        ArgumentNullException.ThrowIfNull(name);
        return new ServiceListing
        {
            Id = Guid.CreateVersion7(publishedAt),
            ApplicationId = application.Id,
            MemberId = application.MemberId,
            Name = name.Trim(),
            Role = application.Role,
            Category = application.Category,
            Credentials = application.Credentials,
            Where = application.Where,
            Price = application.Price,
            About = application.About,
            PublishedAt = publishedAt,
        };
    }
}
