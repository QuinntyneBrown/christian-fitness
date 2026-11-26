using ChristianFitness.Api.Security;
using ChristianFitness.Application.News;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Published stories for anyone, with or without a session (L2-061; ADR 0105). Reading a story is
/// held to the public-reads limit (L2-034 AC4; ADR 0072).
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/public/stories")]
public sealed class PublicStoriesController(ISender sender) : ControllerBase
{
    /// <summary>The Published story at this link, current or former; else 404 <c>not_found</c>.</summary>
    [HttpGet("{slug}")]
    [EnableRateLimiting(PublicReads.Policy)]
    public async Task<ActionResult<PublishedStoryDto>> Get(string slug, CancellationToken cancellationToken) =>
        await sender.Send(new GetPublishedStoryQuery(slug), cancellationToken).ConfigureAwait(false);
}
