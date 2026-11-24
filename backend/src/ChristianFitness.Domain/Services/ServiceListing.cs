namespace ChristianFitness.Domain.Services;

/// <summary>
/// A professional published on Services (L2-025 AC2; L2-027; ADR 0000): what the approved
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

    public const int ContactUrlMaxLength = 2000;

    /// <summary>The professional's published contact link, an absolute http or https address; none when they take messages here (ADR 0053).</summary>
    public string? ContactUrl { get; private set; }

    /// <summary>Sets the contact link when <paramref name="url"/> is an absolute http or https address; a blank one clears it (ADR 0053).</summary>
    public bool TrySetContactUrl(string? url)
    {
        if (!TryNormalizeContactUrl(url, out var normalized))
        {
            return false;
        }

        ContactUrl = normalized;
        return true;
    }

    /// <summary>Reads a contact link: blank is none (<c>null</c>), else it must be an absolute http or https address with a host and no credentials.</summary>
    public static bool TryNormalizeContactUrl(string? url, out string? normalized)
    {
        normalized = null;
        if (string.IsNullOrWhiteSpace(url))
        {
            return true;
        }

        var trimmed = url.Trim();
        if (trimmed.Length > ContactUrlMaxLength
            || !Uri.TryCreate(trimmed, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            || uri.Host.Length == 0
            || uri.UserInfo.Length > 0)
        {
            return false;
        }

        normalized = trimmed;
        return true;
    }

    /// <summary>Replaces what staff may edit (L2-027 AC1; ADR 0055); the values are already validated and are trimmed here.</summary>
    public void Update(string name, string role, ServiceCategory category, string where, string price, string credentials, string about, string? contactUrl)
    {
        ArgumentNullException.ThrowIfNull(name);
        ArgumentNullException.ThrowIfNull(role);
        ArgumentNullException.ThrowIfNull(where);
        ArgumentNullException.ThrowIfNull(price);
        ArgumentNullException.ThrowIfNull(credentials);
        ArgumentNullException.ThrowIfNull(about);
        if (!TryNormalizeContactUrl(contactUrl, out var normalized))
        {
            throw new ArgumentException("The contact link is not an http or https address.", nameof(contactUrl));
        }

        Name = name.Trim();
        Role = role.Trim();
        Category = category;
        Where = where.Trim();
        Price = price.Trim();
        Credentials = credentials.Trim();
        About = about.Trim();
        ContactUrl = normalized;
    }

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
