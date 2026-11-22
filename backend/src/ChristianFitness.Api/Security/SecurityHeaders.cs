namespace ChristianFitness.Api.Security;

/// <summary>
/// The security headers of every response (L2-030 AC4; ADR 0009). The API serves no script, style
/// or frame, so its policy allows nothing at all, and there is no <c>unsafe-inline</c> to allow.
/// HSTS is added outside Development by <c>UseHsts</c>, which never sends it to localhost.
/// </summary>
internal static class SecurityHeaders
{
    public const string ContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

    public static IServiceCollection AddSecurityHeaders(this IServiceCollection services) =>
        services.AddHsts(options =>
        {
            options.MaxAge = TimeSpan.FromDays(365);
            options.IncludeSubDomains = true;
        });

    /// <summary>
    /// Runs first, so refusals and errors carry the headers too. They are written as the response
    /// starts, since the exception handler clears whatever was set before it.
    /// </summary>
    public static IApplicationBuilder UseSecurityHeaders(this WebApplication app)
    {
        if (!app.Environment.IsDevelopment())
        {
            app.UseHsts();
        }

        return app.Use((context, next) =>
        {
            context.Response.OnStarting(() =>
            {
                var headers = context.Response.Headers;
                headers.ContentSecurityPolicy = ContentSecurityPolicy;
                headers.XContentTypeOptions = "nosniff";
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
                return Task.CompletedTask;
            });
            return next(context);
        });
    }
}
