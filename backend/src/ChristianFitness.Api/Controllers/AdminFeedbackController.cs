using ChristianFitness.Application.Feedback;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The console's feedback inbox (L2-074), routed under <c>api/admin/feedback</c>, the Feedback area,
/// which a Moderator uses as an Admin does (ADR 0064). Each action sends one MediatR request and
/// checks nothing.
/// </summary>
[ApiController]
[Route("api/admin/feedback")]
public sealed class AdminFeedbackController(ISender sender) : ControllerBase
{
    /// <summary>The notes of a status, or all, newest first, and each tab's count (L2-074 AC1, AC2).</summary>
    [HttpGet]
    public async Task<ActionResult<FeedbackListDto>> List([FromQuery] string? status, CancellationToken cancellationToken) =>
        await sender.Send(new ListFeedbackQuery(status), cancellationToken).ConfigureAwait(false);

    /// <summary>One note in full (L2-074 AC3).</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FeedbackNoteDto>> Note(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new GetFeedbackNoteQuery(id), cancellationToken).ConfigureAwait(false);

    /// <summary>A note's screenshot: this address answers a staff session only, and is never cached (L2-074 AC8).</summary>
    [HttpGet("{id:guid}/screenshot")]
    public async Task<IActionResult> Screenshot(Guid id, CancellationToken cancellationToken)
    {
        var image = await sender.Send(new GetFeedbackScreenshotQuery(id), cancellationToken).ConfigureAwait(false);
        Response.Headers[HeaderNames.CacheControl] = "private, no-store";
        Response.Headers[HeaderNames.XContentTypeOptions] = "nosniff";
        return File(image.Content, image.ContentType);
    }

    /// <summary>Replies to a note and answers 201 with the reply kept (L2-074 AC5).</summary>
    [HttpPost("{id:guid}/replies")]
    public async Task<IActionResult> Reply(Guid id, ReplyToFeedbackCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Id = id;
        return StatusCode(StatusCodes.Status201Created, await sender.Send(command, cancellationToken).ConfigureAwait(false));
    }

    /// <summary>Marks a note resolved (L2-074 AC6).</summary>
    [HttpPost("{id:guid}/resolve")]
    public async Task<ActionResult<FeedbackStatusDto>> Resolve(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new ResolveFeedbackCommand(id), cancellationToken).ConfigureAwait(false);

    /// <summary>Reopens a resolved note (L2-074 AC6).</summary>
    [HttpPost("{id:guid}/reopen")]
    public async Task<ActionResult<FeedbackStatusDto>> Reopen(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new ReopenFeedbackCommand(id), cancellationToken).ConfigureAwait(false);
}
