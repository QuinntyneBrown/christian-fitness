using ChristianFitness.Application.Dashboard;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// What the admin Dashboard shows (L2-020; ADR 0058). Routed under <c>api/admin/dashboard</c>, so
/// the Dashboard area's policy admits Admins and Moderators (ADR 0020). One MediatR request each.
/// </summary>
[ApiController]
[Route("api/admin/dashboard")]
public sealed class AdminDashboardController(ISender sender) : ControllerBase
{
    /// <summary>The weekly counts of new members, registrations and messages over the last weeks.</summary>
    [HttpGet("activity")]
    public async Task<ActionResult<CommunityActivityDto>> Activity(CancellationToken cancellationToken) =>
        await sender.Send(new GetCommunityActivityQuery(), cancellationToken).ConfigureAwait(false);

    /// <summary>The pending applications (Admins only) and flagged members waiting for staff: counts and the oldest few.</summary>
    [HttpGet("awaiting")]
    public async Task<ActionResult<WorkAwaitingStaffDto>> Awaiting(CancellationToken cancellationToken) =>
        await sender.Send(new GetWorkAwaitingStaffQuery(), cancellationToken).ConfigureAwait(false);
}
