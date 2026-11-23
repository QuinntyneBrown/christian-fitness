using ChristianFitness.Application.Events;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The events a signed-in member browses (L2-009; ADR 0027). A visitor is refused 401 by the
/// fallback policy; staff manage events through the admin controller.
/// </summary>
[ApiController]
[Route("api/events")]
public sealed class EventsController(ISender sender) : ControllerBase
{
    /// <summary>One page of the published events that have not started, after the cursor a page gave.</summary>
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? cursor, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ListEventsQuery(cursor), cancellationToken).ConfigureAwait(false));
}
