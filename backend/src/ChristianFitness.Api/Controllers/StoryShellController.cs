using ChristianFitness.Application.News;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// A story's address as the static host proxies it (L2-061 AC8, AC11; ADR 0105): the member app's
/// shell with the story's metadata, a move to its current address, or the shell with 404. Not held
/// to <c>public-reads</c>, and never kept by a cache.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("stories")]
public sealed class StoryShellController(ISender sender) : ControllerBase
{
    [HttpGet("{slug}")]
    public async Task<IActionResult> Get(string slug, CancellationToken cancellationToken)
    {
        var answer = await sender.Send(new GetStoryShellQuery(slug), cancellationToken).ConfigureAwait(false);
        Response.Headers[HeaderNames.CacheControl] = "no-store";
        return answer.Outcome switch
        {
            StoryShellOutcome.Story => Html(answer.Html!, StatusCodes.Status200OK),
            StoryShellOutcome.Moved => RedirectPermanent(answer.Location!.AbsoluteUri),
            StoryShellOutcome.NotFound => Html(answer.Html!, StatusCodes.Status404NotFound),
            _ => StatusCode(StatusCodes.Status503ServiceUnavailable),
        };
    }

    private static ContentResult Html(string html, int status) =>
        new() { Content = html, ContentType = "text/html; charset=utf-8", StatusCode = status };
}
