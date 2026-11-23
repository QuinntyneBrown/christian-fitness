using ChristianFitness.Application.Chat;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The stored messages of a private conversation with a member (L2-016 AC6; slice 14.1; ADR 0043); live
/// messages travel over <see cref="Chat.ChatHub"/>. An unknown, suspended or own id is refused 403
/// <c>recipient_unavailable</c>.
/// </summary>
[ApiController]
[Route("api/messages/{memberId:guid}")]
public sealed class DirectMessagesController(ISender sender) : ControllerBase
{
    /// <summary>The latest 50 messages, or the 50 before the message <paramref name="before"/>.</summary>
    [HttpGet("messages")]
    public async Task<IActionResult> Messages(Guid memberId, [FromQuery] Guid? before, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetDirectHistoryQuery(memberId, before), cancellationToken).ConfigureAwait(false));

    /// <summary>The caller opened the conversation: its unread count becomes zero.</summary>
    [HttpPost("read")]
    public async Task<IActionResult> Read(Guid memberId, CancellationToken cancellationToken)
    {
        await sender.Send(new MarkDirectReadCommand(memberId), cancellationToken).ConfigureAwait(false);
        return NoContent();
    }
}
