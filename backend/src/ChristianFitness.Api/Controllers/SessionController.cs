using ChristianFitness.Application.Sessions;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>The member's session: sign in, who is signed in, sign out (L2-004; ADR 0007, ADR 0009).</summary>
[ApiController]
[Route("api/session")]
public sealed class SessionController(ISender sender) : ControllerBase
{
    /// <summary>Signs the member in with the session cookie. Anonymous: a visitor has no session yet (L2-031 AC1).</summary>
    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> SignIn(SignInCommand command, CancellationToken cancellationToken) =>
        Ok(await sender.Send(command, cancellationToken).ConfigureAwait(false));

    /// <summary>Who is signed in; a visitor is refused 401 by the fallback policy.</summary>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetSessionQuery(), cancellationToken).ConfigureAwait(false));
}
