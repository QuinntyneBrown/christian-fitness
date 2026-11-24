using ChristianFitness.Application.Chat;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// A member reports a message of a group chat or a direct conversation (L2-017; slice 25.1; ADR 0000).
/// 201 once recorded; 403 <c>cannot_report_own_message</c>, 404 <c>message_not_found</c>, 409
/// <c>already_reported</c>, 400 <c>field_too_long</c>.
/// </summary>
[ApiController]
[Route("api/messages/{id:guid}/reports")]
public sealed class ReportsController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Report(Guid id, [FromBody] ReportMessageBody body, CancellationToken cancellationToken)
    {
        await sender.Send(new ReportMessageCommand(id, body.Reason), cancellationToken).ConfigureAwait(false);
        return StatusCode(StatusCodes.Status201Created);
    }
}

/// <summary>What the report dialog sends. A class, not a record, so no generated <c>ToString</c> can print the reason.</summary>
public sealed class ReportMessageBody
{
    public string? Reason { get; init; }
}
