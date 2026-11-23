using System.Security.Claims;
using ChristianFitness.Api.Errors;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationModels;

namespace ChristianFitness.Api.Security;

internal static class AuthenticationSetup
{
    /// <summary>The member session cookie. Join issues it (slice 2.1); L2-030 AC2 holds its rules.</summary>
    public const string SessionCookie = "__Host-cf-session";

    /// <summary>The staff session cookie of the admin app (L2-018; ADR 0011).</summary>
    public const string StaffCookie = "__Host-cf-admin";

    /// <summary>The policy every admin endpoint requires: a staff session with a staff role (L2-018 AC4).</summary>
    public const string StaffPolicy = "Staff";

    /// <summary>Every controller routed under this prefix requires <see cref="StaffPolicy"/>.</summary>
    public const string AdminRoutePrefix = "api/admin";

    /// <summary>A member session lasts 14 days from the last request (ADR 0007).</summary>
    public static readonly TimeSpan SessionLifetime = TimeSpan.FromDays(14);

    /// <summary>A staff session ends 30 minutes after its last request (L2-018 AC5; ADR 0016).</summary>
    public static readonly TimeSpan StaffIdleTimeout = TimeSpan.FromMinutes(30);

    /// <summary>Picks the member or the staff session for whatever does not name a scheme.</summary>
    private const string SelectorScheme = "Session";

    /// <summary>
    /// The two cookie schemes, and the fallback policy that makes every endpoint require a session
    /// unless it is marked anonymous (L2-031 AC1). An API refuses with a status, never a redirect.
    /// The cookies are protected by Data Protection keys kept in <c>DataProtection:KeysPath</c> when
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
            .AddAuthentication(SelectorScheme)
            .AddPolicyScheme(SelectorScheme, null, options => options.ForwardDefaultSelector = SchemeFor)
            .AddCookie(SessionSchemes.Member, options =>
            {
                options.Cookie.Name = SessionCookie;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.ExpireTimeSpan = SessionLifetime;
                options.SlidingExpiration = true;
                Refuse(options);
            })
            .AddCookie(SessionSchemes.Staff, options =>
            {
                // Staff never arrive from a link in an email, so Strict costs nothing (ADR 0011).
                options.Cookie.Name = StaffCookie;
                options.Cookie.SameSite = SameSiteMode.Strict;
                Refuse(options);

                // Idle expiry (L2-018 AC5; ADR 0016): every request moves the end to 30 minutes
                // later, not only one after half the lifetime as the handler would by default.
                options.ExpireTimeSpan = StaffIdleTimeout;
                options.SlidingExpiration = true;
                options.Events.OnCheckSlidingExpiration = context =>
                {
                    context.ShouldRenew = true;
                    return Task.CompletedTask;
                };
                options.Events.OnRedirectToLogin = context =>
                {
                    // A session the store found expired: staff must sign in again, and the cookie goes.
                    if (DatabaseTicketStore.FoundExpired(context.HttpContext))
                    {
                        ProblemCodes.Override(context.HttpContext, ProblemCodes.SessionExpired);
                        context.Response.Cookies.Delete(StaffCookie, new CookieOptions
                        {
                            Path = "/",
                            Secure = true,
                            HttpOnly = true,
                            SameSite = SameSiteMode.Strict,
                        });
                    }

                    return Refuse(context.Response, StatusCodes.Status401Unauthorized);
                };
            });

        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
            .AddPolicy(StaffPolicy, policy => policy
                .AddAuthenticationSchemes(SessionSchemes.Staff)
                .RequireAuthenticatedUser()
                .RequireClaim(ClaimTypes.Role, Enum.GetNames<StaffRoleName>()));

        return services;
    }

    /// <summary>
    /// Every controller routed under <see cref="AdminRoutePrefix"/> requires <see cref="StaffPolicy"/>,
    /// so a later admin endpoint cannot forget it; <c>[AllowAnonymous]</c> on an action (the staff
    /// sign-in) still opts out (L2-018 AC4).
    /// </summary>
    public static void AddStaffAreaConvention(this MvcOptions options) =>
        options.Conventions.Add(new StaffAreaConvention());

    /// <summary>
    /// What an endpoint without a scheme of its own reads: the member session, except for a request
    /// for an antiforgery token that carries only the staff cookie, so the admin app's token belongs
    /// to the signed-in staff member. Admin endpoints name the staff scheme in their policy, which
    /// also makes the request's user the staff member, so their answers carry a staff token too.
    /// </summary>
    private static string SchemeFor(HttpContext context)
    {
        var cookies = context.Request.Cookies;
        return context.Request.Path.StartsWithSegments(AntiforgerySetup.TokenPath, StringComparison.Ordinal)
            && cookies.ContainsKey(StaffCookie)
            && !cookies.ContainsKey(SessionCookie)
                ? SessionSchemes.Staff
                : SessionSchemes.Member;
    }

    private static void Refuse(CookieAuthenticationOptions options)
    {
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.Path = "/";
        options.Events.OnRedirectToLogin = context => Refuse(context.Response, StatusCodes.Status401Unauthorized);
        options.Events.OnRedirectToAccessDenied = context => Refuse(context.Response, StatusCodes.Status403Forbidden);
    }

    // The status-code pages write the ProblemDetails body.
    private static Task Refuse(HttpResponse response, int status)
    {
        response.StatusCode = status;
        return Task.CompletedTask;
    }

    private sealed class StaffAreaConvention : IControllerModelConvention
    {
        public void Apply(ControllerModel controller)
        {
            foreach (var selector in controller.Selectors)
            {
                if (selector.AttributeRouteModel?.Template is { } template
                    && (template.Equals(AdminRoutePrefix, StringComparison.OrdinalIgnoreCase)
                        || template.StartsWith(AdminRoutePrefix + "/", StringComparison.OrdinalIgnoreCase)))
                {
                    selector.EndpointMetadata.Add(new AuthorizeAttribute(StaffPolicy));
                }
            }
        }
    }
}
