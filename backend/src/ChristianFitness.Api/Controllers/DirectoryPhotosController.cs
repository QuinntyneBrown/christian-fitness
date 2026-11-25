using ChristianFitness.Application.Directory.Review;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// A listing's photo for anyone, since the directory shows it to visitors (ADR 0087, as ADR 0025
/// serves event images). The key is unguessable; the photo is served as the type its key names,
/// never sniffed, and kept for a year because a key's photo never changes.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/directory/photos")]
public sealed class DirectoryPhotosController(ISender sender) : ControllerBase
{
    [HttpGet("{key}")]
    public async Task<IActionResult> Get(string key, CancellationToken cancellationToken)
    {
        var photo = await sender.Send(new GetListingPhotoQuery(key), cancellationToken).ConfigureAwait(false);
        Response.Headers[HeaderNames.CacheControl] = "public, max-age=31536000, immutable";
        Response.Headers[HeaderNames.XContentTypeOptions] = "nosniff";
        return File(photo.Content, photo.ContentType);
    }
}
