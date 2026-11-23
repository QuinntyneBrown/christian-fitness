using ChristianFitness.Api.Errors;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ChristianFitness.Api.Security;

/// <summary>
/// Antiforgery for every state-changing request (L2-030 AC3; ADR 0009). The token's secret half is
/// the HttpOnly cookie <see cref="Cookie"/>; the half the app reads is the cookie
/// <see cref="TokenCookie"/>, which it sends back in the <see cref="Header"/> header. A page on
/// another origin can make the browser send the cookies but cannot read the token, so its request
/// lacks the header and is refused with 400 <c>antiforgery_failed</c> before a controller runs.
/// </summary>
internal static class AntiforgerySetup
{
    public const string Cookie = "__Host-cf-antiforgery";
    public const string TokenCookie = "__Host-cf-xsrf";
    public const string Header = "X-XSRF-TOKEN";
    public const string Code = "antiforgery_failed";

    /// <summary>Where a visitor gets their first token.</summary>
    public const string TokenPath = "/api/antiforgery";

    public static IServiceCollection AddRequestAntiforgery(this IServiceCollection services)
    {
        services.AddAntiforgery(options =>
        {
            options.Cookie = new AlwaysSecureCookieBuilder
            {
                Name = Cookie,
                HttpOnly = true,
                SameSite = SameSiteMode.Strict,
                Path = "/",
            };
            options.HeaderName = Header;
        });
        return services;
    }

    /// <summary>
    /// Every unsafe method of every controller needs the token, anonymous ones included. MVC's own
    /// <c>AutoValidateAntiforgeryTokenAttribute</c> needs the view features an API does not load, so
    /// <see cref="AntiforgeryValidationFilter"/> asks <see cref="IAntiforgery"/> the same question.
    /// </summary>
    public static void AddAntiforgeryFilters(this MvcOptions options) =>
        options.Filters.Add<AntiforgeryValidationFilter>();

    /// <summary>
    /// Gives a visitor their first token (<c>GET /api/antiforgery</c>, 204); every API response
    /// carries a fresh one anyway (<see cref="UseAntiforgeryTokens"/>).
    /// </summary>
    public static void MapAntiforgeryToken(this IEndpointRouteBuilder endpoints) =>
        endpoints.MapGet(TokenPath, () => Results.NoContent()).AllowAnonymous();

    /// <summary>
    /// Sets the readable token cookie on every <c>/api/</c> response, for whoever the request ends
    /// as: signing in or out changes the request's user, so the answer to join, sign-in and
    /// sign-out carries a token for the new identity.
    /// </summary>
    public static IApplicationBuilder UseAntiforgeryTokens(this IApplicationBuilder app) =>
        app.Use((context, next) =>
        {
            // An event image is public and immutable: a token would add no-store to it (ADR 0025).
            if (context.Request.Path.StartsWithSegments("/api", StringComparison.Ordinal)
                && !context.Request.Path.StartsWithSegments("/api/events/images", StringComparison.Ordinal))
            {
                context.Response.OnStarting(() =>
                {
                    var tokens = context.RequestServices.GetRequiredService<IAntiforgery>().GetAndStoreTokens(context);
                    context.Response.Cookies.Append(TokenCookie, tokens.RequestToken!, new CookieOptions
                    {
                        HttpOnly = false,
                        Secure = true,
                        SameSite = SameSiteMode.Strict,
                        Path = "/",
                    });
                    return Task.CompletedTask;
                });
            }

            return next(context);
        });

    /// <summary>
    /// Validates the token of every request but a safe one (<c>GET</c>, <c>HEAD</c>, <c>OPTIONS</c>,
    /// <c>TRACE</c>) before the action runs, and answers a refusal with a ProblemDetails carrying
    /// <see cref="Code"/> (L2-032 AC4).
    /// </summary>
    private sealed class AntiforgeryValidationFilter(IAntiforgery antiforgery) : IAsyncAuthorizationFilter
    {
        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            var method = context.HttpContext.Request.Method;
            if (HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method) || HttpMethods.IsTrace(method))
            {
                return;
            }

            if (!await antiforgery.IsRequestValidAsync(context.HttpContext).ConfigureAwait(false))
            {
                context.Result = new ObjectResult(new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Extensions = { ["code"] = Code },
                })
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    ContentTypes = { "application/problem+json" },
                };
            }
        }
    }

    /// <summary>
    /// Marks the cookie <c>Secure</c> whatever the request's scheme, as the session cookie is. With
    /// <c>SecurePolicy = Always</c>, antiforgery instead refuses to run when the API sees plain HTTP,
    /// as it does behind the development proxy or a proxy that ends TLS.
    /// </summary>
    private sealed class AlwaysSecureCookieBuilder : CookieBuilder
    {
        public override CookieOptions Build(HttpContext context, DateTimeOffset expiresFrom)
        {
            var options = base.Build(context, expiresFrom);
            options.Secure = true;
            return options;
        }
    }
}
