using ChristianFitness.Application.Sessions;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>The signed-in member's session (ADR 0007). Sign-in and sign-out join it in slice 3.1.</summary>
[ApiController]
[Route("api/session")]
public sealed class SessionController(ISender sender) : ControllerBase
{
    /// <summary>Who is signed in; a visitor is refused 401 by the fallback policy.</summary>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetSessionQuery(), cancellationToken).ConfigureAwait(false));
}
