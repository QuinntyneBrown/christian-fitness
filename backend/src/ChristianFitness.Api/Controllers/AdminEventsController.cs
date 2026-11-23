using ChristianFitness.Application.Events;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Staff list events and create drafts (L2-022; ADR 0020). Routed under <c>api/admin</c>, so every
/// action requires the Staff policy (ADR 0011). Each action sends one MediatR request.
/// </summary>
[ApiController]
[Route("api/admin/events")]
public sealed class AdminEventsController(ISender sender) : ControllerBase
{
    /// <summary>The counts of every tab and the events of <paramref name="status"/> (all, published or draft), soonest first.</summary>
    [HttpGet]
    public async Task<ActionResult<AdminEventListDto>> List([FromQuery] string? status, CancellationToken cancellationToken) =>
        await sender.Send(new ListAdminEventsQuery(status), cancellationToken).ConfigureAwait(false);

    /// <summary>Saves a new event as a draft and answers 201 with it.</summary>
    [HttpPost]
    public async Task<IActionResult> Create(CreateEventCommand command, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, await sender.Send(command, cancellationToken).ConfigureAwait(false));
}
