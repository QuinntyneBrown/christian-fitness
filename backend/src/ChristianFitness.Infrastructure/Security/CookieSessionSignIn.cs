using System.Globalization;
using System.Security.Claims;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Members;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace ChristianFitness.Infrastructure.Security;

/// <summary>The cookie schemes of the two sessions (ADR 0007, ADR 0011).</summary>
public static class SessionSchemes
{
    /// <summary>The member session of the member app.</summary>
    public const string Member = "Cookies";

    /// <summary>The staff session of the admin app.</summary>
    public const string Staff = "Staff";
}

/// <summary>
/// Issues and ends the member session cookie (L2-030 AC2, L2-004 AC5; ADR 0007, ADR 0009). The
/// principal holds the member id only: no name, email or faith detail travels in the session. The
/// session is kept on the server (<see cref="DatabaseTicketStore"/>), so signing out ends it there.
/// The request's user becomes the new identity at once, so the response's antiforgery token is
/// issued for it.
/// </summary>
internal sealed class CookieSessionSignIn(IHttpContextAccessor accessor) : ISessionSignIn
{
    public Task SignInAsync(Member member)
    {
        ArgumentNullException.ThrowIfNull(member);
        return CookieSignIn.SignInAsync(accessor, SessionSchemes.Member, [CookieSignIn.IdOf(member)], persistent: true);
    }

    public Task SignOutAsync() => CookieSignIn.SignOutAsync(accessor, SessionSchemes.Member);
}

/// <summary>
/// Issues and ends the staff session cookie of the admin app (L2-018; ADR 0011): the member id and
/// the staff role, nothing personal, kept on the server like the member session. It is not
/// persistent: it ends with the browser.
/// </summary>
internal sealed class CookieStaffSessionSignIn(IHttpContextAccessor accessor) : IStaffSessionSignIn
{
    public Task SignInAsync(Member member, StaffRoleName role)
    {
        ArgumentNullException.ThrowIfNull(member);
        return CookieSignIn.SignInAsync(
            accessor,
            SessionSchemes.Staff,
            [CookieSignIn.IdOf(member), new Claim(ClaimTypes.Role, role.ToString())],
            persistent: false);
    }

    public Task SignOutAsync() => CookieSignIn.SignOutAsync(accessor, SessionSchemes.Staff);
}

/// <summary>What both sessions do to sign in and out.</summary>
internal static class CookieSignIn
{
    public static Claim IdOf(Member member) =>
        new(ClaimTypes.NameIdentifier, member.Id.ToString("D", CultureInfo.InvariantCulture));

    /// <summary>
    /// Signs in with a new session key every time (session fixation, OWASP ASVS 3.2.1; ADR 0100).
    /// The cookie handler renews the key a request's cookie already names, so a copy of an earlier
    /// cookie would inherit this sign-in. When the request carries the scheme's cookie, its session
    /// is ended on the server first, the cookie is taken off the request, and a handler that has not
    /// read it stores the ticket under a new key; only the new cookie is answered.
    /// </summary>
    public static async Task SignInAsync(IHttpContextAccessor accessor, string scheme, IEnumerable<Claim> claims, bool persistent)
    {
        var context = Current(accessor);
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, scheme));
        var properties = new AuthenticationProperties { IsPersistent = persistent };
        var cookieName = context.RequestServices.GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>().Get(scheme).Cookie.Name!;
        if (!context.Request.Cookies.ContainsKey(cookieName))
        {
            await context.SignInAsync(scheme, principal, properties).ConfigureAwait(false);
            context.User = principal;
            return;
        }

        await context.SignOutAsync(scheme).ConfigureAwait(false);
        DropCookie(context, cookieName);
        var schemes = context.RequestServices.GetRequiredService<IAuthenticationSchemeProvider>();
        var found = await schemes.GetSchemeAsync(scheme).ConfigureAwait(false)
            ?? throw new InvalidOperationException($"No authentication scheme {scheme}.");
        var handler = (IAuthenticationSignInHandler)ActivatorUtilities.CreateInstance(context.RequestServices, found.HandlerType);
        await handler.InitializeAsync(found, context).ConfigureAwait(false);
        await handler.SignInAsync(principal, properties).ConfigureAwait(false);
        context.User = principal;
    }

    /// <summary>Takes <paramref name="name"/> off the request, and the sign-out's deletion of it off the response.</summary>
    private static void DropCookie(HttpContext context, string name)
    {
        var prefix = name + "=";
        context.Request.Headers.Cookie = string.Join(
            "; ",
            context.Request.Cookies.Where(cookie => cookie.Key != name).Select(cookie => $"{cookie.Key}={cookie.Value}"));
        context.Response.Headers.SetCookie = new StringValues(
            [.. context.Response.Headers.SetCookie.Where(value => value is not null && !value.StartsWith(prefix, StringComparison.Ordinal))]);
    }

    public static async Task SignOutAsync(IHttpContextAccessor accessor, string scheme)
    {
        var context = Current(accessor);
        await context.SignOutAsync(scheme).ConfigureAwait(false);
        context.User = new ClaimsPrincipal(new ClaimsIdentity());
    }

    private static HttpContext Current(IHttpContextAccessor accessor) =>
        accessor.HttpContext ?? throw new InvalidOperationException("A session is issued or ended only during a request.");
}
