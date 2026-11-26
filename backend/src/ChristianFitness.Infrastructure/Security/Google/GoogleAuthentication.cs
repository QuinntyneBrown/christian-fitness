using System.Security.Claims;
using ChristianFitness.Application.Sessions.Google;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace ChristianFitness.Infrastructure.Security.Google;

/// <summary>
/// Google sign-in for both apps (L2-049; ADR 0062, ADR 0099): ASP.NET Core's OpenID Connect handler,
/// registered once per app, completes the authorization code flow on the server with a
/// <c>state</c>, a nonce and PKCE, checks the ID token itself and keeps only the Google identity in
/// the <c>__Host-cf-google</c> cookie for the screen's finish. No Google token is saved.
/// </summary>
public static class GoogleAuthentication
{
    /// <summary>The member app's OpenID Connect scheme.</summary>
    public const string MemberScheme = "GoogleMember";

    /// <summary>The admin app's OpenID Connect scheme, limited to the team's domain.</summary>
    public const string StaffScheme = "GoogleStaff";

    /// <summary>The cookie scheme that holds a checked Google identity until a screen finishes with it.</summary>
    public const string ExternalScheme = "GoogleExternal";

    /// <summary>The external identity's cookie (L2-049 AC12).</summary>
    public const string ExternalCookie = "__Host-cf-google";

    public const string MemberCallbackPath = "/api/session/google/callback";
    public const string StaffCallbackPath = "/api/admin/session/google/callback";

    /// <summary>How long an attempt, and then the kept identity, lasts (L2-049 AC5, AC12).</summary>
    public static readonly TimeSpan AttemptLifetime = TimeSpan.FromMinutes(10);

    internal const string IntentItem = "cf.intent";
    internal const string ReturnPathItem = "cf.return";
    internal const string SelectAccountItem = "cf.select";

    /// <summary>The only claims sign-in uses, read from Google's checked ID token (L2-049 AC2).</summary>
    private static readonly string[] KeptClaims = ["sub", "email", "email_verified", "name", "picture", "hd"];

    /// <summary>
    /// The two OpenID Connect schemes and the external cookie. The Google client comes from
    /// <c>Google:ClientId</c> and <c>Google:ClientSecret</c>, the team's domain from
    /// <c>Google:StaffDomain</c>; with no client the schemes stay registered but every start is
    /// refused <c>google_unavailable</c> (<see cref="OpenIdConnectGoogleChallenge.IsConfigured"/>).
    /// </summary>
    public static AuthenticationBuilder AddGoogleSignIn(this AuthenticationBuilder builder, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(builder);
        ArgumentNullException.ThrowIfNull(configuration);
        builder.Services.Configure<GoogleSettings>(configuration.GetSection(GoogleSettings.Section));
        builder.Services.AddScoped<IGoogleChallenge, OpenIdConnectGoogleChallenge>();

        var settings = configuration.GetSection(GoogleSettings.Section).Get<GoogleSettings>() ?? new GoogleSettings();
        var memberBaseUrl = configuration["MemberApp:BaseUrl"];
        var adminBaseUrl = configuration["AdminApp:BaseUrl"];
        return builder
            .AddCookie(ExternalScheme, options =>
            {
                options.Cookie.Name = ExternalCookie;
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = Microsoft.AspNetCore.Http.CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.Path = "/";
                options.ExpireTimeSpan = AttemptLifetime;
                options.SlidingExpiration = false;
                options.Events.OnRedirectToLogin = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return Task.CompletedTask;
                };
            })
            .AddOpenIdConnect(MemberScheme, options => Configure(options, settings, MemberCallbackPath, memberBaseUrl, hostedDomain: null))
            .AddOpenIdConnect(StaffScheme, options => Configure(options, settings, StaffCallbackPath, adminBaseUrl, settings.StaffDomain));
    }

    /// <summary>The screen an attempt returns to, with <paramref name="marker"/> (<c>returned</c> or <c>failed</c>) or none (a cancel).</summary>
    internal static string ScreenOf(AuthenticationProperties? properties, string? marker)
    {
        var intent = properties?.Items.TryGetValue(IntentItem, out var given) == true ? given : GoogleIntents.SignIn;
        var returnPath = properties?.Items.TryGetValue(ReturnPathItem, out var path) == true ? path : null;
        var query = new List<string>();
        if (marker is not null)
        {
            query.Add("google=" + marker);
        }

        if (returnPath is not null)
        {
            query.Add("returnUrl=" + Uri.EscapeDataString(returnPath));
        }

        var screen = intent == GoogleIntents.Join ? "/join" : "/sign-in";
        return query.Count == 0 ? screen : $"{screen}?{string.Join('&', query)}";
    }

    private static void Configure(OpenIdConnectOptions options, GoogleSettings settings, string callbackPath, string? baseUrl, string? hostedDomain)
    {
        options.SignInScheme = ExternalScheme;
        options.Authority = "https://accounts.google.com";
        // Unconfigured, a placeholder keeps the handler's own checks quiet; no start reaches it.
        options.ClientId = string.IsNullOrWhiteSpace(settings.ClientId) ? "unconfigured" : settings.ClientId;
        options.ClientSecret = settings.ClientSecret;
        options.CallbackPath = callbackPath;
        options.ResponseType = OpenIdConnectResponseType.Code;
        // Google answers by GET, so the attempt's cookies can be SameSite=Lax (ADR 0099).
        options.ResponseMode = OpenIdConnectResponseMode.Query;
        options.UsePkce = true;
        options.Scope.Clear();
        options.Scope.Add("openid");
        options.Scope.Add("email");
        options.Scope.Add("profile");
        options.SaveTokens = false;
        options.GetClaimsFromUserInfoEndpoint = false;
        options.MapInboundClaims = false;
        options.DisableTelemetry = true;
        options.RemoteAuthenticationTimeout = AttemptLifetime;
        options.TokenValidationParameters.ValidIssuers = ["https://accounts.google.com", "accounts.google.com"];
        options.TokenValidationParameters.NameClaimType = "name";
        foreach (var cookie in new[] { options.CorrelationCookie, options.NonceCookie })
        {
            cookie.SameSite = SameSiteMode.Lax;
            cookie.SecurePolicy = Microsoft.AspNetCore.Http.CookieSecurePolicy.Always;
            cookie.HttpOnly = true;
        }

        options.Events.OnRedirectToIdentityProvider = context =>
        {
            // Google returns to the app's registered address, never one built from the Host header.
            if (!string.IsNullOrWhiteSpace(baseUrl))
            {
                context.ProtocolMessage.RedirectUri = baseUrl.TrimEnd('/') + callbackPath;
            }

            if (context.Properties.Items.ContainsKey(SelectAccountItem))
            {
                context.ProtocolMessage.Prompt = "select_account";
            }

            if (hostedDomain is not null)
            {
                context.ProtocolMessage.SetParameter("hd", hostedDomain);
            }

            return Task.CompletedTask;
        };
        options.Events.OnTokenValidated = context =>
        {
            // Keep only what sign-in uses: no token, code, state or nonce goes into the cookie.
            var kept = context.Principal!.Claims.Where(claim => KeptClaims.Contains(claim.Type, StringComparer.Ordinal));
            context.Principal = new ClaimsPrincipal(new ClaimsIdentity(kept, ExternalScheme, "name", "role"));
            return Task.CompletedTask;
        };
        options.Events.OnAccessDenied = context =>
        {
            // A cancel at Google returns to the screen with no message (L2-049 AC5).
            context.Response.Redirect(ScreenOf(context.Properties, marker: null));
            context.HandleResponse();
            return Task.CompletedTask;
        };
        options.Events.OnRemoteFailure = context =>
        {
            // Nobody is signed in and nothing is created; the screen says it didn't finish (L2-049 AC5).
            context.Response.Redirect(ScreenOf(context.Properties, "failed"));
            context.HandleResponse();
            return Task.CompletedTask;
        };
    }
}

/// <summary>The Google client (<c>Google:*</c>), documented in docs/operations/settings.md.</summary>
public sealed class GoogleSettings
{
    public const string Section = "Google";

    public string? ClientId { get; set; }

    public string? ClientSecret { get; set; }

    /// <summary>The team's Google Workspace domain; staff sign-in needs it (L2-018).</summary>
    public string? StaffDomain { get; set; }
}
