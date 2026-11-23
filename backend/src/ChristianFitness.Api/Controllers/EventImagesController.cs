using ChristianFitness.Application.Events;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// An event's image for anyone, since the landing page and the member events show them (L2-022
/// AC10; ADR 0025). The key is unguessable and the image is not personal data. It is served as the
/// type its key names, never sniffed, and kept for a year because a key's image never changes.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/events/images")]
public sealed class EventImagesController(ISender sender) : ControllerBase
{
    [HttpGet("{key}")]
    public async Task<IActionResult> Get(string key, CancellationToken cancellationToken)
    {
        var image = await sender.Send(new GetEventImageQuery(key), cancellationToken).ConfigureAwait(false);
        Response.Headers[HeaderNames.CacheControl] = "public, max-age=31536000, immutable";
        Response.Headers[HeaderNames.XContentTypeOptions] = "nosniff";
        return File(image.Content, image.ContentType);
    }
}
