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

    /// <summary>One published listing in full (L2-013 AC4; ADR 0051).</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ServiceListingDto>> Get(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new GetServiceQuery(id), cancellationToken).ConfigureAwait(false);
}
