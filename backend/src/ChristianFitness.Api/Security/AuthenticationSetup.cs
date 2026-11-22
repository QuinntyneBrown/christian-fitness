using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;

namespace ChristianFitness.Api.Security;

internal static class AuthenticationSetup
{
    /// <summary>The member session cookie. Sign-in (slice 3.1) issues it; L2-030 AC2 holds its rules.</summary>
    public const string SessionCookie = "__Host-cf-session";

    /// <summary>
    /// The cookie scheme, and the fallback policy that makes every endpoint require a session
    /// unless it is marked anonymous (L2-031 AC1). An API refuses with a status, never a redirect.
    /// </summary>
    public static IServiceCollection AddSessionAuthentication(this IServiceCollection services)
    {
        services
            .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(options =>
            {
                options.Cookie.Name = SessionCookie;
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.Path = "/";
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
