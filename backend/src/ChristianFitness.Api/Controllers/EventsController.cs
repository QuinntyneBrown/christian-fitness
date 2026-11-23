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
    /// <summary>
    /// One page of the published events that have not started, after the cursor a page gave, of one
    /// category when asked (ADR 0030).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? cursor, [FromQuery] string? category, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ListEventsQuery(cursor, category), cancellationToken).ConfigureAwait(false));
}
