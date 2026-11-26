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
    /// (L2-052 AC2; ADR 0101). Answers the series as they now see it; 403 <c>account_suspended</c>,
    /// 404 <c>series_not_found</c> or 409 <c>series_full</c>.
    /// </summary>
    [HttpPost("{id:guid}/enrolment")]
    public async Task<ActionResult<SeriesDetailDto>> Join(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new JoinSeriesCommand(id), cancellationToken).ConfigureAwait(false);

    /// <summary>
    /// The signed-in member leaves the series: the places still to come go back and they leave its
    /// chat (L2-052 AC9; ADR 0101). Answers the series as they now see it; 404 <c>series_not_found</c>.
    /// </summary>
    [HttpDelete("{id:guid}/enrolment/me")]
    public async Task<ActionResult<SeriesDetailDto>> Leave(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new LeaveSeriesCommand(id), cancellationToken).ConfigureAwait(false);

    /// <summary>
    /// The signed-in member's dates still to come become exactly <c>sessionIds</c>, all or none
    /// (L2-053 AC2, AC4, AC6; ADR 0102). Answers the series as they now see it; 400
    /// <c>sessions_invalid</c>, 403 <c>account_suspended</c>, 404 <c>series_not_found</c> or 409
    /// <c>event_full</c> with the full sessions' numbers.
    /// </summary>
    [HttpPut("{id:guid}/drop-ins")]
    public async Task<ActionResult<SeriesDetailDto>> SetDropIns(Guid id, SetDropInDatesBody body, CancellationToken cancellationToken) =>
        await sender.Send(new SetDropInDatesCommand(id, body?.SessionIds ?? []), cancellationToken).ConfigureAwait(false);
}

/// <summary>What the series page sends to change the member's dates: every date to come they want to hold (ADR 0102).</summary>
public sealed record SetDropInDatesBody(IReadOnlyList<Guid>? SessionIds);
