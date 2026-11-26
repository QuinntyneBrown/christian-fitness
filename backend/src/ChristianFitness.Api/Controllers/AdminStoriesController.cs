using ChristianFitness.Application.News;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Admins list, write, review, preview, publish, schedule, update and unpublish stories (L2-068, L2-069; ADR
/// 0097). Routed under <c>api/admin/stories</c>, the Publishing area, which refuses a Moderator with
/// <c>forbidden_role</c>. Each action sends one MediatR request and checks nothing.
/// </summary>
[ApiController]
[Route("api/admin/stories")]
public sealed class AdminStoriesController(ISender sender) : ControllerBase
{
    /// <summary>Room above the 5 MB image limit, so a larger image is refused by the rule with its code, not by the server.</summary>
    private const int ImageBodyLimit = 10 * 1024 * 1024;

    /// <summary>One page of one tab of Stories (L2-068 AC1 to AC3, AC8).</summary>
    [HttpGet]
    public async Task<ActionResult<AdminStoryListDto>> List([FromQuery] string? status, [FromQuery] int? page, CancellationToken cancellationToken) =>
        await sender.Send(new ListAdminStoriesQuery(status, page), cancellationToken).ConfigureAwait(false);

    /// <summary>New story: answers 201 with the Draft (L2-069 AC1).</summary>
    [HttpPost]
    public async Task<IActionResult> Create(CreateStoryCommand command, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, await sender.Send(command, cancellationToken).ConfigureAwait(false));

    /// <summary>Stores one lead image and answers 201 with its key and size (L2-069 AC9). Larger bodies than the limit are refused before this runs.</summary>
    [HttpPost("images")]
    [RequestSizeLimit(ImageBodyLimit)]
    [RequestFormLimits(MultipartBodyLengthLimit = ImageBodyLimit)]
    public async Task<IActionResult> UploadImage(IFormFile file, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(file);
        await using var content = file.OpenReadStream();
        return StatusCode(StatusCodes.Status201Created, await sender.Send(new UploadStoryImageCommand(content, file.Length), cancellationToken).ConfigureAwait(false));
    }

    /// <summary>The editor's choices: bylines, events and listings (L2-069 AC1, AC7).</summary>
    [HttpGet("options")]
    public async Task<ActionResult<StoryOptionsDto>> Options(CancellationToken cancellationToken) =>
        await sender.Send(new GetStoryOptionsQuery(), cancellationToken).ConfigureAwait(false);

    /// <summary>One story for the editor.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AdminStoryDto>> Get(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new GetAdminStoryQuery(id), cancellationToken).ConfigureAwait(false);

    /// <summary>The story as readers will see it, whatever its status, never indexed (L2-069 AC13).</summary>
    [HttpGet("{id:guid}/preview")]
    public async Task<ActionResult<StoryPreviewDto>> Preview(Guid id, CancellationToken cancellationToken)
    {
        Response.Headers["X-Robots-Tag"] = "noindex";
        return await sender.Send(new GetStoryPreviewQuery(id), cancellationToken).ConfigureAwait(false);
    }

    /// <summary>The autosave of a Draft or a story In review (L2-069 AC8, AC12).</summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AdminStoryDto>> Save(Guid id, SaveStoryCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Id = id;
        return await sender.Send(command, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Send for review (L2-069 AC2).</summary>
    [HttpPost("{id:guid}/submit")]
    public async Task<ActionResult<AdminStoryDto>> Submit(Guid id, SubmitStoryCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Id = id;
        return await sender.Send(command, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Back to draft (L2-069 AC3).</summary>
    [HttpPost("{id:guid}/return-to-draft")]
    public async Task<ActionResult<AdminStoryDto>> ReturnToDraft(Guid id, ReturnStoryToDraftCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Id = id;
        return await sender.Send(command, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Publish now, or Approve &amp; publish: saves the fields and publishes (L2-069 AC2, AC3, AC7).</summary>
    [HttpPost("{id:guid}/publish")]
    public async Task<ActionResult<AdminStoryDto>> Publish(Guid id, PublishStoryCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Id = id;
        return await sender.Send(command, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Update a Published story: the changes are live at once (L2-069 AC5).</summary>
    [HttpPost("{id:guid}/update")]
    public async Task<ActionResult<AdminStoryDto>> Update(Guid id, UpdateStoryCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Id = id;
        return await sender.Send(command, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Schedule, or Approve &amp; schedule: saves the fields and schedules the story for a Toronto date and time after now (L2-069 AC2, AC3, AC7).</summary>
    [HttpPost("{id:guid}/schedule")]
    public async Task<ActionResult<AdminStoryDto>> Schedule(Guid id, ScheduleStoryCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Id = id;
        return await sender.Send(command, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Unschedule: a Scheduled story whose time has not come becomes a Draft (L2-069 AC4).</summary>
    [HttpPost("{id:guid}/unschedule")]
    public async Task<ActionResult<AdminStoryDto>> Unschedule(Guid id, UnscheduleStoryCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Id = id;
        return await sender.Send(command, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Unpublish: the story becomes a Draft and leaves readers at once (L2-069 AC5).</summary>
    [HttpPost("{id:guid}/unpublish")]
    public async Task<ActionResult<AdminStoryDto>> Unpublish(Guid id, UnpublishStoryCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Id = id;
        return await sender.Send(command, cancellationToken).ConfigureAwait(false);
    }
}
