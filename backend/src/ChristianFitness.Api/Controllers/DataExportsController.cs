using ChristianFitness.Application.Preferences;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

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

    /// <summary>When the link of the member's own archive stops working; any other is 404.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DataExportDto>> Get(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new GetDataExportQuery(id), cancellationToken).ConfigureAwait(false);

    /// <summary>The member's own archive, as a private attachment that is never cached.</summary>
    [HttpGet("{id:guid}/archive")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken)
    {
        var archive = await sender.Send(new GetDataExportArchiveQuery(id), cancellationToken).ConfigureAwait(false);
        Response.Headers[HeaderNames.CacheControl] = "private, no-store";
        Response.Headers[HeaderNames.XContentTypeOptions] = "nosniff";
        return File(archive, "application/zip", "christian-fitness-data.zip");
    }
}
