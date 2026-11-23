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

    /// <summary>
    /// Saves a member's profile and answers it as saved (L2-006 AC2; ADR 0024). Only the session's
    /// own member id is accepted; the handler refuses any other with 403 (AC5).
    /// </summary>
    [HttpPut("/api/members/{memberId}/profile")]
    public async Task<IActionResult> Update(string memberId, UpdateProfileCommand command, CancellationToken cancellationToken) =>
        Ok(await sender.Send(UpdateProfileCommand.For(memberId, command), cancellationToken).ConfigureAwait(false));
}
