using System.Security.Claims;
using ChristianFitness.Application.Abstractions;
using Microsoft.AspNetCore.Http;

namespace ChristianFitness.Infrastructure.Security;

/// <summary>The member id the request's session carries (see <see cref="CookieSessionSignIn"/>).</summary>
internal sealed class HttpCurrentMember(IHttpContextAccessor accessor) : ICurrentMember
{
    public Guid Id => SignedInId ?? throw new InvalidOperationException("The request has no signed-in member.");

    public Guid? SignedInId =>
        Guid.TryParse(accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
}
