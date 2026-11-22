using System.Globalization;
using System.Security.Claims;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Members;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;

namespace ChristianFitness.Infrastructure.Security;

/// <summary>
/// Issues the session cookie for a member (L2-030 AC2; ADR 0007). The principal holds the member
/// id only: no name, email or faith detail travels in the cookie. The session is persistent and
/// lasts as long as the cookie scheme says.
/// </summary>
internal sealed class CookieSessionSignIn(IHttpContextAccessor accessor) : ISessionSignIn
{
    public Task SignInAsync(Member member)
    {
        ArgumentNullException.ThrowIfNull(member);
        var context = accessor.HttpContext ?? throw new InvalidOperationException("A session is issued only during a request.");
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, member.Id.ToString("D", CultureInfo.InvariantCulture))],
            CookieAuthenticationDefaults.AuthenticationScheme);
        return context.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = true });
    }
}
