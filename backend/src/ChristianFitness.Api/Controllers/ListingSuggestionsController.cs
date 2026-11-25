using ChristianFitness.Application.Directory;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// A member suggests someone, or themselves, for the directory (L2-062; journey 17; ADR 0086). A
/// visitor is refused 401 by the fallback policy; the validator and the handler refuse the rest.
/// </summary>
[ApiController]
[Route("api/directory/suggestions")]
public sealed class ListingSuggestionsController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Suggest(SuggestListingCommand command, CancellationToken cancellationToken)
    {
        var created = await sender.Send(command, cancellationToken).ConfigureAwait(false);
        return StatusCode(StatusCodes.Status201Created, created);
    }
}
