using ChristianFitness.Application.Events;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Staff, Admin or Moderator, read and record who came to an event (L2-080; ADR 0106). Routed at
/// the <c>Attendance</c> staff area, which Moderators open, under the Admins-only Events. Each
/// action sends one MediatR request and checks nothing.
/// </summary>
[ApiController]
[Route(Security.AuthenticationSetup.AttendanceRoute)]
public sealed class AdminEventAttendanceController(ISender sender) : ControllerBase
{
    /// <summary>The event's title, start, whether it started, and its registered members with whether they came.</summary>
    [HttpGet]
    public async Task<ActionResult<EventAttendanceDto>> Get(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new GetEventAttendanceQuery(id), cancellationToken).ConfigureAwait(false);

    /// <summary>
    /// Records whether <paramref name="memberId"/> came and answers 204; 404 <c>event_not_found</c> or
    /// <c>not_registered</c>, 409 <c>event_not_started</c>.
    /// </summary>
    [HttpPut("{memberId:guid}")]
    public async Task<IActionResult> Set(Guid id, Guid memberId, SetAttendanceBody body, CancellationToken cancellationToken)
    {
        await sender.Send(new SetAttendanceCommand(id, memberId, body?.Came ?? false), cancellationToken).ConfigureAwait(false);
        return NoContent();
    }
}

/// <summary>What the Attendance tab sends for one member: whether they came (ADR 0106).</summary>
public sealed record SetAttendanceBody(bool Came);
