using ChristianFitness.Application.Events;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Staff list events, create drafts, open and edit an event and upload its image (L2-022; ADR 0021, ADR 0025). Routed under <c>api/admin</c>, so every
/// action requires the Staff policy (ADR 0011). Each action sends one MediatR request.
/// </summary>
[ApiController]
[Route("api/admin/events")]
public sealed class AdminEventsController(ISender sender) : ControllerBase
{
    /// <summary>The counts of every tab and the events of <paramref name="status"/> (all, published or draft), soonest first.</summary>
    [HttpGet]
    public async Task<ActionResult<AdminEventListDto>> List([FromQuery] string? status, CancellationToken cancellationToken) =>
        await sender.Send(new ListAdminEventsQuery(status), cancellationToken).ConfigureAwait(false);

    /// <summary>Saves a new event as a draft and answers 201 with it.</summary>
    [HttpPost]
    public async Task<IActionResult> Create(CreateEventCommand command, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, await sender.Send(command, cancellationToken).ConfigureAwait(false));

    /// <summary>The host a new event starts with: the Christian Fitness team listing (ADR 0088).</summary>
    [HttpGet("hosts/default")]
    public async Task<ActionResult<EventHostDto>> DefaultHost(CancellationToken cancellationToken) =>
        await sender.Send(new GetDefaultEventHostQuery(), cancellationToken).ConfigureAwait(false);

    /// <summary>One event as the editor shows it; 404 <c>not_found</c> when there is none.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AdminEventDetailDto>> Get(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new GetAdminEventQuery(id), cancellationToken).ConfigureAwait(false);

    /// <summary>The event's capacity, going and registered members' names and dates (L2-024 AC1).</summary>
    [HttpGet("{id:guid}/registrations")]
    public async Task<ActionResult<EventRegistrationsDto>> Registrations(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new GetEventRegistrationsQuery(id), cancellationToken).ConfigureAwait(false);

    /// <summary>Saves changes to the event and answers 200 with it.</summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AdminEventDto>> Update(Guid id, UpdateEventCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Id = id;
        return await sender.Send(command, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Publishes a draft and answers 200 with the event (L2-023 AC3).</summary>
    [HttpPost("{id:guid}/publish")]
    public async Task<ActionResult<AdminEventDto>> Publish(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new PublishEventCommand(id), cancellationToken).ConfigureAwait(false);

    /// <summary>Cancels a published event and answers 200 with it (L2-023 AC2).</summary>
    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<AdminEventDto>> Cancel(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new CancelEventCommand(id), cancellationToken).ConfigureAwait(false);

    /// <summary>Stores one image and answers 201 with its key. Larger bodies than the limit are refused before this runs.</summary>
    [HttpPost("images")]
    [RequestSizeLimit(ImageBodyLimit)]
    [RequestFormLimits(MultipartBodyLengthLimit = ImageBodyLimit)]
    public async Task<IActionResult> UploadImage(IFormFile file, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(file);
        await using var content = file.OpenReadStream();
        return StatusCode(StatusCodes.Status201Created, await sender.Send(new UploadEventImageCommand(content, file.Length), cancellationToken).ConfigureAwait(false));
    }

    /// <summary>Room above the 5 MB image limit, so a larger image is refused by the rule with its code, not by the server.</summary>
    private const int ImageBodyLimit = 10 * 1024 * 1024;
}
