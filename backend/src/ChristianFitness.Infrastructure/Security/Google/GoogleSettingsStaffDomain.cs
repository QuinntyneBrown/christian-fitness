using ChristianFitness.Application.Sessions.Google;
using Microsoft.Extensions.Options;

namespace ChristianFitness.Infrastructure.Security.Google;

/// <summary>The team's Workspace domain from <c>Google:StaffDomain</c> (docs/operations/settings.md).</summary>
internal sealed class GoogleSettingsStaffDomain(IOptions<GoogleSettings> settings) : IGoogleStaffDomain
{
    public string? Domain => string.IsNullOrWhiteSpace(settings.Value.StaffDomain) ? null : settings.Value.StaffDomain.Trim();
}
