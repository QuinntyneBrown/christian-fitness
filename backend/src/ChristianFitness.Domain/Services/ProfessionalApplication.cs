namespace ChristianFitness.Domain.Services;

/// <summary>
/// A member's request to be listed on Services (L2-026; ADR 0047): role, category, credentials,
/// where, price and about. It is created Pending; only a Pending one blocks a new application.
/// </summary>
public sealed class ProfessionalApplication
{
    public const int RoleMaxLength = 80;
    public const int CredentialsMaxLength = 200;
    public const int WhereMaxLength = 80;
    public const int PriceMaxLength = 60;
    public const int AboutMaxLength = 300;

    private ProfessionalApplication()
    {
    }

    public Guid Id { get; private set; }

    public Guid MemberId { get; private set; }

    public string Role { get; private set; } = string.Empty;

    public ServiceCategory Category { get; private set; }

    /// <summary>Plain text: never rendered as HTML (L2-032).</summary>
    public string Credentials { get; private set; } = string.Empty;

    public string Where { get; private set; } = string.Empty;

    public string Price { get; private set; } = string.Empty;

    public string About { get; private set; } = string.Empty;

    public ApplicationStatus Status { get; private set; }

    public DateTimeOffset SubmittedAt { get; private set; }

    /// <summary>A Pending application by <paramref name="memberId"/> at <paramref name="submittedAt"/>; every text is trimmed.</summary>
    public static ProfessionalApplication Submit(
        Guid memberId, string role, ServiceCategory category, string credentials, string where, string price, string about, DateTimeOffset submittedAt)
    {
        ArgumentNullException.ThrowIfNull(role);
        ArgumentNullException.ThrowIfNull(credentials);
        ArgumentNullException.ThrowIfNull(where);
        ArgumentNullException.ThrowIfNull(price);
        ArgumentNullException.ThrowIfNull(about);
        return new ProfessionalApplication
        {
            Id = Guid.CreateVersion7(submittedAt),
            MemberId = memberId,
            Role = role.Trim(),
            Category = category,
            Credentials = credentials.Trim(),
            Where = where.Trim(),
            Price = price.Trim(),
            About = about.Trim(),
            Status = ApplicationStatus.Pending,
            SubmittedAt = submittedAt,
        };
    }
}
