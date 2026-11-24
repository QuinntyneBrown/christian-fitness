using ChristianFitness.Application.Services;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The professionals a signed-in member browses (L2-013; ADR 0050). A visitor is refused 401 by the
/// fallback policy; staff manage listings through the admin controllers.
/// </summary>
[ApiController]
[Route("api/services")]
public sealed class ServicesController(ISender sender) : ControllerBase
{
    /// <summary>The published listings, of one category when asked, in a stable order.</summary>
    [HttpGet]
    public async Task<ActionResult<ServiceListingsDto>> List([FromQuery] string? category, CancellationToken cancellationToken) =>
        await sender.Send(new ListServicesQuery(category), cancellationToken).ConfigureAwait(false);
}
