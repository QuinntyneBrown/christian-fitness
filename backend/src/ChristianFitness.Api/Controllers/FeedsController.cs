using ChristianFitness.Api.Feeds;
using ChristianFitness.Api.Security;
using ChristianFitness.Application.News;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The RSS feeds at the site's root, not under <c>api/</c> (L2-060; ADR 0072, ADR 0108): All stories at
/// <c>/feed</c> and one section at <c>/{section}/feed</c>. Anyone reads them, held to
/// <c>public-reads</c>; outside <c>/api</c>, no antiforgery cookie is set.
/// </summary>
[ApiController]
[AllowAnonymous]
[EnableRateLimiting(PublicReads.Policy)]
public sealed class FeedsController(ISender sender) : ControllerBase
{
    [HttpGet("feed")]
    public async Task<IActionResult> All(CancellationToken cancellationToken) =>
        new RssFeedResult(await sender.Send(new GetStoryFeedQuery(null), cancellationToken).ConfigureAwait(false));

    [HttpGet("{section}/feed")]
    public async Task<IActionResult> Section(string section, CancellationToken cancellationToken) =>
        new RssFeedResult(await sender.Send(new GetStoryFeedQuery(section), cancellationToken).ConfigureAwait(false));
}
