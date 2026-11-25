using ChristianFitness.Application.Directory;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The directory (L2-054; ADR 0082). Anyone may read it, since it answers only what published
/// listings publish.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/directory")]
public sealed class DirectoryController(ISender sender) : ControllerBase
{
    /// <summary>One page of the published listings in kind and name order, or of one kind, with each kind's count.</summary>
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? kind, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ListDirectoryQuery(kind), cancellationToken).ConfigureAwait(false));
}
