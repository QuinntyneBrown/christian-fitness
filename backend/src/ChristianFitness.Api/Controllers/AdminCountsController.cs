using ChristianFitness.Application.Admin;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The counts beside the console's navigation (ADR 0079; ADR 0090). Routed under
/// <c>api/admin/counts</c>, which is the console area, open to every staff role. One MediatR request.
/// </summary>
[ApiController]
[Route("api/admin/counts")]
public sealed class AdminCountsController(ISender sender) : ControllerBase
{
    /// <summary>How much work waits behind each area.</summary>
    [HttpGet]
    public async Task<ActionResult<AdminCountsDto>> Get(CancellationToken cancellationToken) =>
        await sender.Send(new GetAdminCountsQuery(), cancellationToken).ConfigureAwait(false);
}
