using ChristianFitness.Application.News;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Admins manage the bylines stories run under (L2-077; ADR 0093). Routed under
/// <c>api/admin/stories/bylines</c>, the Publishing area, which refuses a Moderator with
/// <c>forbidden_role</c>. Each action sends one MediatR request and checks nothing.
/// </summary>
[ApiController]
[Route("api/admin/stories/bylines")]
public sealed class AdminBylinesController(ISender sender) : ControllerBase
{
    /// <summary>Every byline in name order, with how many stories use each.</summary>
    [HttpGet]
    public async Task<ActionResult<BylineListDto>> List(CancellationToken cancellationToken) =>
        await sender.Send(new ListBylinesQuery(), cancellationToken).ConfigureAwait(false);
}
