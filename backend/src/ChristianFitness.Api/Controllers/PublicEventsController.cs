using ChristianFitness.Application.Events;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>What a visitor with no session may read: the landing page's next events (L2-001; ADR 0037, ADR 0105).</summary>
[ApiController]
[AllowAnonymous]
[Route("api/public/events")]
public sealed class PublicEventsController(ISender sender) : ControllerBase
{
    /// <summary>The next published events that have not started, at most four.</summary>
    [HttpGet("upcoming")]
    public async Task<IActionResult> Upcoming([FromQuery] int take, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetUpcomingEventsQuery(take), cancellationToken).ConfigureAwait(false));
}
