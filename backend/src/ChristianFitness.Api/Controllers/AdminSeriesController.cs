using ChristianFitness.Application.Series;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Staff list, open, create and edit event series and add their dates (L2-071; ADR 0091). Routed
/// under <c>api/admin/series</c>, the Series area, which Moderators use as Admins do. Each action
/// sends one MediatR request.
/// </summary>
[ApiController]
[Route("api/admin/series")]
public sealed class AdminSeriesController(ISender sender) : ControllerBase
{
    /// <summary>Every series by its next session, at most 100.</summary>
    [HttpGet]
    public async Task<ActionResult<AdminSeriesListDto>> List(CancellationToken cancellationToken) =>
        await sender.Send(new ListAdminSeriesQuery(), cancellationToken).ConfigureAwait(false);

    /// <summary>One series and its sessions; 404 <c>not_found</c> when there is none.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AdminSeriesDto>> Get(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new GetAdminSeriesQuery(id), cancellationToken).ConfigureAwait(false);
}
