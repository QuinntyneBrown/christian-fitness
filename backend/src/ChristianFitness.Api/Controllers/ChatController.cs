using ChristianFitness.Application.Chat;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The stored messages of an event's group chat (L2-016 AC6; ADR 0040); live messages travel over
/// <see cref="Chat.ChatHub"/>. A visitor is refused 401 by the fallback policy, a member not
/// registered for the event 403 <c>not_a_participant</c>.
/// </summary>
[ApiController]
[Route("api/events/{id:guid}/chat")]
public sealed class ChatController(ISender sender) : ControllerBase
{
    /// <summary>The latest 50 messages, or the 50 before the message <paramref name="before"/>.</summary>
    [HttpGet("messages")]
    public async Task<IActionResult> Messages(Guid id, [FromQuery] Guid? before, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetChatHistoryQuery(id, before), cancellationToken).ConfigureAwait(false));
}
