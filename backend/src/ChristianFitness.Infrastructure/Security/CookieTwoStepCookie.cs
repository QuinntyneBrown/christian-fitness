using ChristianFitness.Application.Abstractions;
using Microsoft.AspNetCore.Http;

namespace ChristianFitness.Infrastructure.Security;

/// <summary>
/// The step cookie <c>__Host-cf-admin-step</c> (L2-046; ADR 0012): <c>Secure</c>, <c>HttpOnly</c>,
/// <c>SameSite=Strict</c>, path <c>/</c>, no domain, expiring with its challenge.
/// </summary>
internal sealed class CookieTwoStepCookie(IHttpContextAccessor accessor) : ITwoStepCookie
{
    public const string Name = "__Host-cf-admin-step";

    public void Issue(string token, DateTimeOffset expiresAt) =>
        Current.Response.Cookies.Append(Name, token, Options(expiresAt));

    public string? Read() => Current.Request.Cookies.TryGetValue(Name, out var token) && token.Length > 0 ? token : null;

    public void Clear() => Current.Response.Cookies.Delete(Name, Options(null));

    private HttpContext Current =>
        accessor.HttpContext ?? throw new InvalidOperationException("The step cookie is read or set only during a request.");

    private static CookieOptions Options(DateTimeOffset? expiresAt) => new()
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Path = "/",
        Expires = expiresAt,
        IsEssential = true,
    };
}
