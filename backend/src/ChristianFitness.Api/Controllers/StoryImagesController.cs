using ChristianFitness.Application.News;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// A story's lead image for anyone, since published stories are public (L2-069 AC9; ADR 0097), served
/// as event images are (ADR 0025): the key is unguessable, the image is served as the type its key
/// names, never sniffed, and kept for a year because a key's image never changes.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/stories/images")]
public sealed class StoryImagesController(ISender sender) : ControllerBase
{
    [HttpGet("{key}")]
    public async Task<IActionResult> Get(string key, CancellationToken cancellationToken)
    {
        var image = await sender.Send(new GetStoryImageQuery(key), cancellationToken).ConfigureAwait(false);
        Response.Headers[HeaderNames.CacheControl] = "public, max-age=31536000, immutable";
        Response.Headers[HeaderNames.XContentTypeOptions] = "nosniff";
        return File(image.Content, image.ContentType);
    }
}
