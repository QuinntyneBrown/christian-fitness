using ChristianFitness.Application.Preferences;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// A member's copy of their data (L2-066 AC1 to AC3; ADR 0117), under the fallback policy: a member
/// asks for and downloads only their own. Each action sends one MediatR request and checks nothing.
/// </summary>
[ApiController]
[Route("api/data-exports")]
public sealed class DataExportsController(ISender sender) : ControllerBase
{
    /// <summary>Records the request, or answers the one made in the last 24 hours.</summary>
    [HttpPost]
    public async Task<ActionResult<DataExportRequestedDto>> Ask(CancellationToken cancellationToken) =>
        await sender.Send(new RequestDataExportCommand(), cancellationToken).ConfigureAwait(false);
}
