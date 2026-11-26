using ChristianFitness.Application.Series;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The event series a signed-in member browses (L2-050; ADR 0093). A visitor is refused 401 by the
/// fallback policy; staff manage series through the admin controller.
/// </summary>
[ApiController]
[Route("api/events/series")]
public sealed class SeriesController(ISender sender) : ControllerBase
{
    /// <summary>
    /// The series with a session still to come, by their next session, at most 100 (L2-050 AC1,
    /// AC5), of one category when asked, whose title contains <paramref name="q"/>, and only the
    /// signed-in member's when <paramref name="joined"/> is <c>true</c> (ADR 0093).
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<SeriesListDto>> List([FromQuery] string? category, [FromQuery] string? q, [FromQuery] string? joined, CancellationToken cancellationToken) =>
        await sender.Send(new ListSeriesQuery(category, q, joined), cancellationToken).ConfigureAwait(false);

    /// <summary>How many series the Series view lists with no filter (L2-050 AC6).</summary>
    [HttpGet("count")]
    public async Task<ActionResult<SeriesCountDto>> Count(CancellationToken cancellationToken) =>
        await sender.Send(new CountSeriesQuery(), cancellationToken).ConfigureAwait(false);

    /// <summary>
    /// One series as its page shows it (L2-051; ADR 0096); one with no held date, or an unknown id,
    /// is 404 <c>series_not_found</c>.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SeriesDetailDto>> Get(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new GetSeriesQuery(id), cancellationToken).ConfigureAwait(false);

    /// <summary>
    /// The signed-in member joins the series: a place at every session to come and its one chat
    /// (L2-052 AC2; ADR 0099). Answers the series as they now see it; 403 <c>account_suspended</c>,
    /// 404 <c>series_not_found</c> or 409 <c>series_full</c>.
    /// </summary>
    [HttpPost("{id:guid}/enrolment")]
    public async Task<ActionResult<SeriesDetailDto>> Join(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new JoinSeriesCommand(id), cancellationToken).ConfigureAwait(false);
}
