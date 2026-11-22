using System.Globalization;
using System.Security.Claims;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Members;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;

namespace ChristianFitness.Infrastructure.Security;

/// <summary>
/// Issues and ends the session cookie (L2-030 AC2, L2-004 AC5; ADR 0007, ADR 0009). The principal
/// holds the member id only: no name, email or faith detail travels in the session. The session is
/// kept on the server (<see cref="DatabaseTicketStore"/>), so signing out ends it there. The
/// request's user becomes the new identity at once, so the response's antiforgery token is issued
/// for it.
/// </summary>
internal sealed class CookieSessionSignIn(IHttpContextAccessor accessor) : ISessionSignIn
{
    public async Task SignInAsync(Member member)
    {
        ArgumentNullException.ThrowIfNull(member);
        var context = Current();
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, member.Id.ToString("D", CultureInfo.InvariantCulture))],
            CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);
        await context.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal,
            new AuthenticationProperties { IsPersistent = true }).ConfigureAwait(false);
        context.User = principal;
    }

    public async Task SignOutAsync()
    {
        var context = Current();
        await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme).ConfigureAwait(false);
        context.User = new ClaimsPrincipal(new ClaimsIdentity());
    }

    private HttpContext Current() =>
        accessor.HttpContext ?? throw new InvalidOperationException("A session is issued or ended only during a request.");
}
