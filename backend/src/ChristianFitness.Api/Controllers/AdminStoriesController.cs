using ChristianFitness.Application.News;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Admins list, write, review, preview, publish, update and unpublish stories (L2-068, L2-069; ADR
/// 0097). Routed under <c>api/admin/stories</c>, the Publishing area, which refuses a Moderator with
/// <c>forbidden_role</c>. Each action sends one MediatR request and checks nothing.
/// </summary>
[ApiController]
[Route("api/admin/stories")]
public sealed class AdminStoriesController(ISender sender) : ControllerBase
{
    /// <summary>One page of one tab of Stories (L2-068 AC1 to AC3, AC8).</summary>
    [HttpGet]
    public async Task<ActionResult<AdminStoryListDto>> List([FromQuery] string? status, [FromQuery] int? page, CancellationToken cancellationToken) =>
        await sender.Send(new ListAdminStoriesQuery(status, page), cancellationToken).ConfigureAwait(false);
}
