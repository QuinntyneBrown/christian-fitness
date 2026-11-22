using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;

namespace ChristianFitness.Api.Security;

internal static class AuthenticationSetup
{
    /// <summary>The member session cookie. Join issues it (slice 2.1); L2-030 AC2 holds its rules.</summary>
    public const string SessionCookie = "__Host-cf-session";

    /// <summary>A member session lasts 14 days from the last request (ADR 0007).</summary>
    public static readonly TimeSpan SessionLifetime = TimeSpan.FromDays(14);

    /// <summary>
    /// The cookie scheme, and the fallback policy that makes every endpoint require a session
    /// unless it is marked anonymous (L2-031 AC1). An API refuses with a status, never a redirect.
    /// The cookie is protected by Data Protection keys kept in <c>DataProtection:KeysPath</c> when
    /// it is set, so sessions survive a restart and every instance shares them.
    /// </summary>
    public static IServiceCollection AddSessionAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var dataProtection = services.AddDataProtection().SetApplicationName("christian-fitness");
        if (configuration["DataProtection:KeysPath"] is { Length: > 0 } keysPath)
        {
            dataProtection.PersistKeysToFileSystem(new DirectoryInfo(keysPath));
        }

        services
            .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(options =>
            {
                options.Cookie.Name = SessionCookie;
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.Path = "/";
                options.ExpireTimeSpan = SessionLifetime;
                options.SlidingExpiration = true;
                options.Events.OnRedirectToLogin = context => Refuse(context.Response, StatusCodes.Status401Unauthorized);
                options.Events.OnRedirectToAccessDenied = context => Refuse(context.Response, StatusCodes.Status403Forbidden);
            });

        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

        return services;
    }

    // The status-code pages write the ProblemDetails body.
    private static Task Refuse(HttpResponse response, int status)
    {
        response.StatusCode = status;
        return Task.CompletedTask;
    }
}
