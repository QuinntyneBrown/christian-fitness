using ChristianFitness.Application.News;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Admins list, write, review, preview, publish, update and unpublish stories (L2-068, L2-069; ADR
/// 0097). Routed under <c>api/admin/stories</c>, the Publishing area, which refuses a Moderator with
/// <c>forbidden_role</c>. Each action sends one MediatR request and checks nothing.
/// </summary>
[ApiController]
[Route("api/admin/stories")]
public sealed class AdminStoriesController(ISender sender) : ControllerBase
{
    /// <summary>One page of one tab of Stories (L2-068 AC1 to AC3, AC8).</summary>
    [HttpGet]
    public async Task<ActionResult<AdminStoryListDto>> List([FromQuery] string? status, [FromQuery] int? page, CancellationToken cancellationToken) =>
        await sender.Send(new ListAdminStoriesQuery(status, page), cancellationToken).ConfigureAwait(false);

    /// <summary>New story: answers 201 with the Draft (L2-069 AC1).</summary>
    [HttpPost]
    public async Task<IActionResult> Create(CreateStoryCommand command, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, await sender.Send(command, cancellationToken).ConfigureAwait(false));

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
}