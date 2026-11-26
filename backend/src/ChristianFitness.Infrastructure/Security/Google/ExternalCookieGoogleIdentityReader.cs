using System.Globalization;
using ChristianFitness.Application.Sessions.Google;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;

namespace ChristianFitness.Infrastructure.Security.Google;

/// <summary>
/// Reads the Google identity from the <c>__Host-cf-google</c> cookie the callback wrote (L2-049
/// AC12): Data Protection checks it and its 10 minutes. An identity is read only by the app whose
/// scheme kept it, so a staff attempt never finishes a member sign-in, nor the other way round.
/// </summary>
internal sealed class ExternalCookieGoogleIdentityReader(IHttpContextAccessor accessor) : IGoogleIdentityReader
{
    /// <summary>Where the remote handler records which scheme kept the identity.</summary>
    private const string AuthSchemeItem = ".AuthScheme";

    public async Task<GoogleIdentity?> ReadAsync(GoogleApp app)
    {
        var context = accessor.HttpContext ?? throw new InvalidOperationException("No request to read the Google identity from.");
        var result = await context.AuthenticateAsync(GoogleAuthentication.ExternalScheme).ConfigureAwait(false);
        if (!result.Succeeded
            || result.Properties?.Items.TryGetValue(AuthSchemeItem, out var scheme) != true
            || scheme != GoogleAuthentication.SchemeOf(app))
        {
            return null;
        }

        var principal = result.Principal;
        var subject = principal.FindFirst("sub")?.Value;
        var email = principal.FindFirst("email")?.Value;
        if (string.IsNullOrEmpty(subject) || string.IsNullOrEmpty(email))
        {
            return null;
        }

        return new GoogleIdentity
        {
            Subject = subject,
            Email = email,
            EmailVerified = bool.TryParse(principal.FindFirst("email_verified")?.Value, out var verified) && verified,
            Name = principal.FindFirst("name")?.Value,
            PictureUrl = principal.FindFirst("picture")?.Value,
            HostedDomain = principal.FindFirst("hd")?.Value?.ToLower(CultureInfo.InvariantCulture),
        };
    }

    public Task ForgetAsync()
    {
        var context = accessor.HttpContext ?? throw new InvalidOperationException("No request to forget the Google identity in.");
        // When the response starts, so it is deleted even when a refusal clears the headers set
        // before it (the exception handler does).
        context.Response.OnStarting(() =>
        {
            context.Response.Cookies.Delete(GoogleAuthentication.ExternalCookie, new CookieOptions
            {
                Path = "/",
                Secure = true,
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
            });
            return Task.CompletedTask;
        });
        return Task.CompletedTask;
    }
}
