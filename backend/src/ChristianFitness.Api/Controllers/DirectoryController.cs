using ChristianFitness.Api.Security;
using ChristianFitness.Application.Directory;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The directory (L2-054; ADR 0082). Anyone may read it, since it answers only what published
/// listings publish, and an anonymous caller is held to the public-reads limit (ADR 0072).
/// </summary>
[ApiController]
[AllowAnonymous]
[EnableRateLimiting(PublicReads.Policy)]
[Route("api/directory")]
public sealed class DirectoryController(ISender sender) : ControllerBase
{
    /// <summary>One page of the published listings in kind and name order, or of one kind, matching a search, with each kind's count.</summary>
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? kind, [FromQuery] string? q, [FromQuery] string? cursor, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ListDirectoryQuery(kind, q, cursor), cancellationToken).ConfigureAwait(false));
}
