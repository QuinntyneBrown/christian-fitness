using ChristianFitness.Application.Events;
using ChristianFitness.Application.Series;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Staff list, open, create and edit event series and add their dates (L2-071; ADR 0091). Routed
/// under <c>api/admin/series</c>, the Series area, which Moderators use as Admins do, so the host
/// picker and the image upload have routes here that send the event editor's requests (ADR 0089,
/// ADR 0025). Each action sends one MediatR request.
/// </summary>
[ApiController]
[Route("api/admin/series")]
public sealed class AdminSeriesController(ISender sender) : ControllerBase
{
    /// <summary>Every series by its next session, at most 100.</summary>
    [HttpGet]
    public async Task<ActionResult<AdminSeriesListDto>> List(CancellationToken cancellationToken) =>
        await sender.Send(new ListAdminSeriesQuery(), cancellationToken).ConfigureAwait(false);

    /// <summary>Saves a new series with no dates and answers 201 with it (L2-071 AC12).</summary>
    [HttpPost]
    public async Task<IActionResult> Create(CreateSeriesCommand command, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, await sender.Send(command, cancellationToken).ConfigureAwait(false));

    /// <summary>The Listed directory listings whose name matches <paramref name="q"/>, for the Host picker (L2-071 AC10).</summary>
    [HttpGet("hosts")]
    public async Task<ActionResult<EventHostListDto>> Hosts([FromQuery] string? q, CancellationToken cancellationToken) =>
        await sender.Send(new SearchEventHostsQuery(q), cancellationToken).ConfigureAwait(false);

    /// <summary>The host a new series starts with: the Christian Fitness team listing (L2-071 AC10).</summary>
    [HttpGet("hosts/default")]
    public async Task<ActionResult<EventHostDto>> DefaultHost(CancellationToken cancellationToken) =>
        await sender.Send(new GetDefaultEventHostQuery(), cancellationToken).ConfigureAwait(false);

    /// <summary>One series and its sessions; 404 <c>not_found</c> when there is none.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AdminSeriesDto>> Get(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new GetAdminSeriesQuery(id), cancellationToken).ConfigureAwait(false);

    /// <summary>Saves the series' details and answers 200 with it (L2-071 AC13).</summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AdminSeriesDto>> Update(Guid id, UpdateSeriesCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Id = id;
        return await sender.Send(command, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Stores one image and answers 201 with its key, as the event editor's upload does (ADR 0025).</summary>
    /// <summary>Adds a dated session and answers 201 with the series as it now is (L2-071 AC14).</summary>
    [HttpPost("{id:guid}/sessions")]
    public async Task<IActionResult> AddSession(Guid id, AddSessionCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.SeriesId = id;
        return StatusCode(StatusCodes.Status201Created, await sender.Send(command, cancellationToken).ConfigureAwait(false));
    }

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
