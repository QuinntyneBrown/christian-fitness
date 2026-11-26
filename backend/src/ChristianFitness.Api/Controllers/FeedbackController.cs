using ChristianFitness.Application.Feedback;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// A member sends the team feedback (L2-063; journey 30; ADR 0109). A visitor is refused 401 by the
/// fallback policy; the validator and the handler refuse the rest.
/// </summary>
[ApiController]
[Route("api/feedback")]
public sealed class FeedbackController(ISender sender) : ControllerBase
{
    /// <summary>The member's address and the label of the page the note is about.</summary>
    [HttpGet("form")]
    public async Task<ActionResult<FeedbackFormDto>> Form([FromQuery] string? about, CancellationToken cancellationToken) =>
        await sender.Send(new GetFeedbackFormQuery(about), cancellationToken).ConfigureAwait(false);
}
