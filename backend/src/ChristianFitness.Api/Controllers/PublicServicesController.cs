using ChristianFitness.Application.Services;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>What a visitor with no session may read about professionals: the landing page's short list (L2-001 AC5; ADR 0000).</summary>
[ApiController]
[AllowAnonymous]
[Route("api/public/services")]
public sealed class PublicServicesController(ISender sender) : ControllerBase
{
    /// <summary>The first published listings by name, at most three, with public fields only.</summary>
    [HttpGet("featured")]
    public async Task<IActionResult> Featured(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ListLandingProfessionalsQuery(), cancellationToken).ConfigureAwait(false));
}
