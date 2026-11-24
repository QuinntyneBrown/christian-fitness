using ChristianFitness.Application.Services;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Staff review professional applications (L2-025; slice 21.1; ADR 0048). Routed under
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
}
