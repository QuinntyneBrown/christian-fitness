using ChristianFitness.Api.Security;
using ChristianFitness.Application.News;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The stories a visitor with no session may read: the news front page (L2-001; ADR 0105). It
/// answers only what published stories publish, and an anonymous caller is held to the
/// public-reads limit (ADR 0072).
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/public/stories")]
public sealed class PublicStoriesController(ISender sender) : ControllerBase
{
    /// <summary>The lead story, the headlines and one page of the river, or one page of one section's stories.</summary>
    [HttpGet]
    [EnableRateLimiting(PublicReads.Policy)]
    public async Task<ActionResult<FrontPageDto>> FrontPage([FromQuery] string? section, [FromQuery] string? cursor, CancellationToken cancellationToken) =>
        await sender.Send(new ListFrontPageStoriesQuery(section, cursor), cancellationToken).ConfigureAwait(false);
}
