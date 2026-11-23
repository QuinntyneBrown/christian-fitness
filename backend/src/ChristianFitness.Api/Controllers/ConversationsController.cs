using ChristianFitness.Application.Chat;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The member's Messages list (L2-015; ADR 0042). A visitor is refused 401 by the fallback policy; a
/// member sees only the conversations they belong to.
/// </summary>
[ApiController]
[Route("api/conversations")]
public sealed class ConversationsController(ISender sender) : ControllerBase
{
    /// <summary>The caller's conversations, newest first.</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ListConversationsQuery(), cancellationToken).ConfigureAwait(false));
}
