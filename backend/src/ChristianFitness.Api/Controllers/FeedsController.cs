using ChristianFitness.Api.Feeds;
using ChristianFitness.Api.Security;
using ChristianFitness.Application.News;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.RateLimiting;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The RSS feeds at the site's root, not under <c>api/</c> (L2-060; ADR 0072, ADR 0108): All stories at
/// <c>/feed</c> and one section at <c>/{section}/feed</c>. Anyone reads them, held to
/// <c>public-reads</c>, and kept by the feeds' output cache; outside <c>/api</c>, no antiforgery
/// cookie is set.
/// </summary>
[ApiController]
[AllowAnonymous]
[EnableRateLimiting(PublicReads.Policy)]
[OutputCache(PolicyName = FeedOutputCache.Policy)]
public sealed class FeedsController(ISender sender) : ControllerBase
{
    [HttpGet("feed")]
    public Task<IActionResult> All(CancellationToken cancellationToken) => FeedAsync(null, cancellationToken);

    [HttpGet("{section}/feed")]
    public Task<IActionResult> Section(string section, CancellationToken cancellationToken) => FeedAsync(section, cancellationToken);

    private async Task<IActionResult> FeedAsync(string? section, CancellationToken cancellationToken)
    {
        var headers = Request.GetTypedHeaders();
        var query = new GetStoryFeedQuery(section, [.. headers.IfNoneMatch.Select(tag => tag.ToString())], headers.IfModifiedSince);
        return new RssFeedResult(await sender.Send(query, cancellationToken).ConfigureAwait(false));
    }
}
