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
}
