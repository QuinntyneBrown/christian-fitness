namespace ChristianFitness.Domain.Services;

/// <summary>
/// A member's request to be listed on Services (L2-026; ADR 0000): role, category, credentials,
/// where, price and about. It is created Pending; only a Pending one blocks a new application.
/// </summary>
public sealed class ProfessionalApplication
{
    public const int RoleMaxLength = 80;
    public const int CredentialsMaxLength = 200;
    public const int WhereMaxLength = 80;
    public const int PriceMaxLength = 60;
    public const int AboutMaxLength = 300;
    public const int DeclineReasonMaxLength = 500;

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

    /// <summary>When staff approved or declined it; none while Pending.</summary>
    public DateTimeOffset? DecidedAt { get; private set; }

    /// <summary>Why staff declined it, trimmed; sensitive text, never logged. None unless Declined.</summary>
    public string? DeclineReason { get; private set; }

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

    /// <summary>
    /// Approves a Pending application and answers the published listing (L2-025 AC2; ADR 0050);
    /// <paramref name="name"/> is the applicant's name now. A decided application is not approved again.
    /// </summary>
    public bool TryApprove(string name, DateTimeOffset now, out ServiceListing? listing)
    {
        listing = null;
        if (Status != ApplicationStatus.Pending)
        {
            return false;
        }

        Status = ApplicationStatus.Approved;
        DecidedAt = now;
        listing = ServiceListing.Publish(this, name, now);
        return true;
    }

    /// <summary>Declines a Pending application with <paramref name="reason"/> (L2-025 AC3; ADR 0050): no listing.</summary>
    public bool TryDecline(string reason, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(reason);
        if (Status != ApplicationStatus.Pending)
        {
            return false;
        }

        Status = ApplicationStatus.Declined;
        DecidedAt = now;
        DeclineReason = reason.Trim();
        return true;
    }
}
