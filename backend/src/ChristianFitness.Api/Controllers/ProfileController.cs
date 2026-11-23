using ChristianFitness.Application.Profiles;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>A member's profile (L2-005; ADR 0015). A visitor is refused 401 by the fallback policy.</summary>
[ApiController]
[Route("api/profile")]
public sealed class ProfileController(ISender sender) : ControllerBase
{
    /// <summary>The signed-in member's own profile; the session, never the URL, says whose.</summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetOwn(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetOwnProfileQuery(), cancellationToken).ConfigureAwait(false));
}
