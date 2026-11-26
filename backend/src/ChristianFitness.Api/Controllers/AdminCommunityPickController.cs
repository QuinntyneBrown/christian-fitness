using ChristianFitness.Application.CommunityPicks;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Community Pick (L2-072; ADR 0098), routed under <c>api/admin/community-pick</c>, the
/// CommunityPick area, which Moderators use as Admins do. Each action sends one MediatR request.
/// </summary>
[ApiController]
[Route("api/admin/community-pick")]
public sealed class AdminCommunityPickController(ISender sender) : ControllerBase
{
    /// <summary>The published events to come, soonest first, and the member app's public address.</summary>
    [HttpGet("events")]
    public async Task<ActionResult<PickableEventListDto>> Events(CancellationToken cancellationToken) =>
        await sender.Send(new ListPickableEventsQuery(), cancellationToken).ConfigureAwait(false);

    /// <summary>Records a pick of an event with its note and answers 201 with it (L2-072 AC13).</summary>
    [HttpPost("picks")]
    public async Task<IActionResult> Record(RecordPickCommand command, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, await sender.Send(command, cancellationToken).ConfigureAwait(false));
}
