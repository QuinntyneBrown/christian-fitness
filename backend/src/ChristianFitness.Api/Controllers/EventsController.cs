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
    /// category when asked (ADR 0030), whose title contains <paramref name="q"/> (ADR 0081).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? cursor, [FromQuery] string? category, [FromQuery] string? q, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ListEventsQuery(cursor, category, q), cancellationToken).ConfigureAwait(false));

    /// <summary>One published event in full (L2-010; ADR 0031).</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetEventQuery(id), cancellationToken).ConfigureAwait(false));

    /// <summary>The signed-in member takes a place at the event (L2-011; ADR 0032).</summary>
    [HttpPost("{id:guid}/registrations")]
    public async Task<IActionResult> Register(Guid id, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new RegisterForEventCommand(id), cancellationToken).ConfigureAwait(false));

    /// <summary>The signed-in member gives up their place at the event (L2-012; ADR 0034).</summary>
    [HttpDelete("{id:guid}/registrations/me")]
    public async Task<IActionResult> CancelRegistration(Guid id, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new CancelRegistrationCommand(id), cancellationToken).ConfigureAwait(false));
}
