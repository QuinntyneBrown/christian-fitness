using ChristianFitness.Application.Series;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The event series a signed-in member browses (L2-050; ADR 0093). A visitor is refused 401 by the
/// fallback policy; staff manage series through the admin controller.
/// </summary>
[ApiController]
[Route("api/events/series")]
public sealed class SeriesController(ISender sender) : ControllerBase
{
    /// <summary>How many series the Series view lists with no filter (L2-050 AC6).</summary>
    [HttpGet("count")]
    public async Task<ActionResult<SeriesCountDto>> Count(CancellationToken cancellationToken) =>
        await sender.Send(new CountSeriesQuery(), cancellationToken).ConfigureAwait(false);
}
