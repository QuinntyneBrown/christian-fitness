using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Sessions.Google;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace ChristianFitness.Infrastructure.Security.Google;

/// <summary>
/// Runs the app's OpenID Connect challenge and answers the address it would redirect to, in place
/// of the 302, so the screen can show a refusal before it leaves (ADR 0099). The challenge has
/// already set the attempt's correlation and nonce cookies on the response; what the attempt is for
/// and where it returns travel inside the protected <c>state</c>.
/// </summary>
internal sealed class OpenIdConnectGoogleChallenge(IHttpContextAccessor accessor, IOptions<GoogleSettings> settings) : IGoogleChallenge
{
    public bool IsConfigured(GoogleApp app)
    {
        var google = settings.Value;
        return !string.IsNullOrWhiteSpace(google.ClientId)
            && !string.IsNullOrWhiteSpace(google.ClientSecret)
            && (app == GoogleApp.Member || !string.IsNullOrWhiteSpace(google.StaffDomain));
    }

    public async Task<string> BeginAsync(GoogleAttempt attempt, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(attempt);
        var context = accessor.HttpContext ?? throw new InvalidOperationException("A Google sign-in starts only within a request.");
        var properties = new AuthenticationProperties();
        properties.Items[GoogleAuthentication.IntentItem] = attempt.Intent;
        if (attempt.ReturnPath is not null)
        {
            properties.Items[GoogleAuthentication.ReturnPathItem] = attempt.ReturnPath;
        }

        if (attempt.SelectAccount)
        {
            properties.Items[GoogleAuthentication.SelectAccountItem] = "1";
        }

        properties.RedirectUri = GoogleAuthentication.ScreenOf(properties, "returned");
        var scheme = attempt.App == GoogleApp.Member ? GoogleAuthentication.MemberScheme : GoogleAuthentication.StaffScheme;
        try
        {
            await context.ChallengeAsync(scheme, properties).ConfigureAwait(false);
        }
        catch (InvalidOperationException exception)
        {
            // Google's configuration could not be read: Google is not reachable (L2-049 AC11).
            throw new RefusalException(RefusalCodes.GoogleUnavailable, RefusalKind.Unavailable, exception);
        }

        var location = context.Response.Headers.Location.ToString();
        context.Response.Headers.Remove("Location");
        context.Response.StatusCode = StatusCodes.Status200OK;
        return location;
    }
}
