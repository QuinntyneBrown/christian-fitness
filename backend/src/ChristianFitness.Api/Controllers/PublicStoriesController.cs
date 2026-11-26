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
    /// <summary>
    /// The front page of a section, or of Latest without one, its river from the <paramref name="skip"/>th
    /// story (L2-001 AC2, AC3; ADR 0107). An unknown section or a skip past 48 is 400 <c>validation_failed</c>.
    /// </summary>
    [HttpGet]
    [EnableRateLimiting(PublicReads.Policy)]
    public async Task<ActionResult<FrontPageDto>> FrontPage([FromQuery] string? section, [FromQuery] int? skip, CancellationToken cancellationToken) =>
        await sender.Send(new ListFrontPageStoriesQuery(section, skip), cancellationToken).ConfigureAwait(false);

    /// <summary>
    /// "Most read": the five readable stories read most in the last 7 Toronto days, ties to the newer
    /// (L2-001 AC5; ADR 0107). Its own address, so no story's link can hide it.
    /// </summary>
    [HttpGet("/api/public/most-read-stories")]
    [EnableRateLimiting(PublicReads.Policy)]
    public async Task<ActionResult<IReadOnlyList<StorySummaryDto>>> MostRead(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ListMostReadStoriesQuery(), cancellationToken).ConfigureAwait(false));

    /// <summary>
    /// Subscribe's feed list: each feed's name, address and stories a week over the last 28 days,
    /// All stories first (L2-060 AC4; ADR 0110).
    /// </summary>
    [HttpGet("/api/public/feeds")]
    [EnableRateLimiting(PublicReads.Policy)]
    public async Task<ActionResult<IReadOnlyList<FeedSummaryDto>>> Feeds(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ListFeedsQuery(), cancellationToken).ConfigureAwait(false));

    /// <summary>The Published story at this link, current or former; else 404 <c>not_found</c>.</summary>
    [HttpGet("{slug}")]
    [EnableRateLimiting(PublicReads.Policy)]
    public async Task<ActionResult<PublishedStoryDto>> Get(string slug, CancellationToken cancellationToken) =>
        await sender.Send(new GetPublishedStoryQuery(slug), cancellationToken).ConfigureAwait(false);

    /// <summary>
    /// Counts one read of the story (L2-061 AC12; ADR 0105); always 204, whether it counted or not.
    /// Not held to <c>public-reads</c>: opening a story counts once, through <see cref="Get"/>.
    /// </summary>
    [HttpPost("{id:guid}/reads")]
    public async Task<NoContentResult> CountRead(Guid id, CancellationToken cancellationToken)
    {
        await sender.Send(new CountStoryReadCommand(id, Request.Headers.UserAgent.ToString()), cancellationToken).ConfigureAwait(false);
        return NoContent();
    }
}
