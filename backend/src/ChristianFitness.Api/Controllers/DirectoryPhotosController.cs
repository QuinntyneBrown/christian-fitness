using ChristianFitness.Application.Directory;
using ChristianFitness.Application.Directory.Review;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// A listing's photo for anyone, since the directory shows it to visitors (ADR 0090, as ADR 0025
/// serves event images). The key is unguessable; the photo is served as the type its key names,
/// never sniffed, and kept for a year because a key's photo never changes. An owner stores one for
/// their listing (ADR 0093).
/// </summary>
[ApiController]
[Route("api/directory/photos")]
public sealed class DirectoryPhotosController(ISender sender) : ControllerBase
{
    [HttpGet("{key}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(string key, CancellationToken cancellationToken)
    {
        var photo = await sender.Send(new GetListingPhotoQuery(key), cancellationToken).ConfigureAwait(false);
        Response.Headers[HeaderNames.CacheControl] = "public, max-age=31536000, immutable";
        Response.Headers[HeaderNames.XContentTypeOptions] = "nosniff";
        return File(photo.Content, photo.ContentType);
    }

    /// <summary>Stores one photo for the caller's listing and answers 201 with its key. Larger bodies than the limit are refused before this runs.</summary>
    [HttpPost]
    [RequestSizeLimit(PhotoBodyLimit)]
    [RequestFormLimits(MultipartBodyLengthLimit = PhotoBodyLimit)]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(file);
        await using var content = file.OpenReadStream();
        return StatusCode(StatusCodes.Status201Created, await sender.Send(new UploadOwnListingPhotoCommand(content, file.Length), cancellationToken).ConfigureAwait(false));
    }

    /// <summary>Room above the 5 MB photo limit, so a larger photo is refused by the rule with its code, not by the server.</summary>
    private const int PhotoBodyLimit = 10 * 1024 * 1024;
}
