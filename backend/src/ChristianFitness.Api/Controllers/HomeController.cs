using ChristianFitness.Application.Events;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>A member's Home (L2-007; ADR 0044). A visitor is refused 401 by the fallback policy.</summary>
[ApiController]
[Route("api/home")]
public sealed class HomeController(ISender sender) : ControllerBase
{
    /// <summary>The signed-in member's next event and suggested events; the session says whose.</summary>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetHomeQuery(), cancellationToken).ConfigureAwait(false));
}
