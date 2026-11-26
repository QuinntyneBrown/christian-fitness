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

    /// <summary>Stores the note and answers 204 (L2-063 AC6). Larger bodies than the limit are refused before this runs.</summary>
    [HttpPost]
    [RequestSizeLimit(BodyLimit)]
    [RequestFormLimits(MultipartBodyLengthLimit = BodyLimit)]
    public async Task<IActionResult> Send([FromForm] SendFeedbackForm form, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(form);
        ReadOnlyMemory<byte>? screenshot = null;
        if (form.Screenshot is { } file)
        {
            var bytes = new byte[file.Length];
            await using var content = file.OpenReadStream();
            await content.ReadExactlyAsync(bytes, cancellationToken).ConfigureAwait(false);
            screenshot = bytes;
        }

        await sender.Send(
            new SendFeedbackCommand { Kind = form.Kind, Text = form.Text, About = form.About, MayEmail = form.MayEmail, Screenshot = screenshot },
            cancellationToken).ConfigureAwait(false);
        return NoContent();
    }

    /// <summary>Room above the 5 MB screenshot limit and the note, so a larger screenshot is refused by the rule with its code, not by the server.</summary>
    private const int BodyLimit = 10 * 1024 * 1024;
}

/// <summary>The multipart fields of <c>POST /api/feedback</c> (ADR 0109).</summary>
public sealed class SendFeedbackForm
{
    public string? Kind { get; init; }

    public string? Text { get; init; }

    public string? About { get; init; }

    public bool MayEmail { get; init; }

    public IFormFile? Screenshot { get; init; }
}
