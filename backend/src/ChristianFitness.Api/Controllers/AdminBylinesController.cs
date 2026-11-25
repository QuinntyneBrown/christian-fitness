using ChristianFitness.Application.News;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Admins manage the bylines stories run under (L2-077; ADR 0094). Routed under
/// <c>api/admin/stories/bylines</c>, the Publishing area, which refuses a Moderator with
/// <c>forbidden_role</c>. Each action sends one MediatR request and checks nothing.
/// </summary>
[ApiController]
[Route("api/admin/stories/bylines")]
public sealed class AdminBylinesController(ISender sender) : ControllerBase
{
    /// <summary>Every byline in name order, with how many stories use each.</summary>
    [HttpGet]
    public async Task<ActionResult<BylineListDto>> List(CancellationToken cancellationToken) =>
        await sender.Send(new ListBylinesQuery(), cancellationToken).ConfigureAwait(false);

    /// <summary>Adds a byline and answers 201 with it (L2-077 AC3).</summary>
    [HttpPost]
    public async Task<IActionResult> Add(AddBylineCommand command, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, await sender.Send(command, cancellationToken).ConfigureAwait(false));

    /// <summary>Saves a byline and answers 200 with it (L2-077 AC5).</summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<BylineDto>> Update(Guid id, UpdateBylineCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Id = id;
        return await sender.Send(command, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Removes a byline no story uses and answers 204 (L2-077 AC6, AC7).</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Remove(Guid id, CancellationToken cancellationToken)
    {
        await sender.Send(new RemoveBylineCommand(id), cancellationToken).ConfigureAwait(false);
        return NoContent();
    }

    /// <summary>Stores one byline photo and answers 201 with its key. Larger bodies than the limit are refused before this runs.</summary>
    [HttpPost("photos")]
    [RequestSizeLimit(PhotoBodyLimit)]
    [RequestFormLimits(MultipartBodyLengthLimit = PhotoBodyLimit)]
    public async Task<IActionResult> UploadPhoto(IFormFile file, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(file);
        await using var content = file.OpenReadStream();
        return StatusCode(StatusCodes.Status201Created, await sender.Send(new UploadBylinePhotoCommand(content, file.Length), cancellationToken).ConfigureAwait(false));
    }

    /// <summary>Room above the 5 MB photo limit, so a larger photo is refused by the rule with its code, not by the server.</summary>
    private const int PhotoBodyLimit = 10 * 1024 * 1024;
}
