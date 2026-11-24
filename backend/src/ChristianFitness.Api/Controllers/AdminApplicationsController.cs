using ChristianFitness.Application.Services;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Staff review professional applications (L2-025; slice 21.1; ADR 0000). Routed under
/// <c>api/admin/services/applications</c>, so the Services area's policy admits Admins only (ADR 0020).
/// Each action sends one MediatR request.
/// </summary>
[ApiController]
[Route("api/admin/services/applications")]
public sealed class AdminApplicationsController(ISender sender) : ControllerBase
{
    /// <summary>The Pending applications, oldest first, at most 50, with how many wait in all.</summary>
    [HttpGet]
    public async Task<ActionResult<PendingApplicationsDto>> Pending(CancellationToken cancellationToken) =>
        await sender.Send(new ListPendingApplicationsQuery(), cancellationToken).ConfigureAwait(false);

    /// <summary>Approves the application and publishes its listing (slice 21.2; ADR 0050).</summary>
    [HttpPost("{id:guid}/approve")]
    public async Task<ActionResult<ApplicationDecisionDto>> Approve(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new ApproveApplicationCommand(id), cancellationToken).ConfigureAwait(false);

    /// <summary>Declines the application with the body's reason; no listing is created (slice 21.2; ADR 0050).</summary>
    [HttpPost("{id:guid}/decline")]
    public async Task<ActionResult<ApplicationDecisionDto>> Decline(Guid id, DeclineApplicationBody body, CancellationToken cancellationToken) =>
        await sender.Send(new DeclineApplicationCommand(id, body?.Reason), cancellationToken).ConfigureAwait(false);
}

/// <summary>What the decline dialog sends. A class, not a record, so no generated <c>ToString</c> can print the reason.</summary>
public sealed class DeclineApplicationBody
{
    public string? Reason { get; init; }
}
