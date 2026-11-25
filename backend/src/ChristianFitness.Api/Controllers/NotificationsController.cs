using ChristianFitness.Application.Notifications;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The member's in-app inbox (ADR 0068, ADR 0083). A visitor is refused 401 by the fallback policy; a
/// member sees and marks only their own notifications.
/// </summary>
[ApiController]
[Route("api/notifications")]
public sealed class NotificationsController(ISender sender) : ControllerBase
{
    /// <summary>The caller's newest 50 notifications of the last 30 days and the unread count.</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ListNotificationsQuery(), cancellationToken).ConfigureAwait(false));

    /// <summary>Marks every notification of the caller read.</summary>
    [HttpPost("read")]
    public async Task<IActionResult> MarkRead(CancellationToken cancellationToken)
    {
        await sender.Send(new MarkNotificationsReadCommand(), cancellationToken).ConfigureAwait(false);
        return NoContent();
    }
}
