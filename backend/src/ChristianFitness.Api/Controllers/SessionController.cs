using ChristianFitness.Application.Sessions;
using ChristianFitness.Application.Sessions.Google;
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

    /// <summary>Signs the member out: the session ends on the server and its cookie expires.</summary>
    [HttpDelete]
    public async Task<IActionResult> SignOut(CancellationToken cancellationToken)
    {
        await sender.Send(new SignOutCommand(), cancellationToken).ConfigureAwait(false);
        return NoContent();
    }

    /// <summary>
    /// Starts a Google sign-in and answers Google's authorization address, for the screen to leave
    /// for in a full-page redirect (L2-049 AC1; ADR 0099). Anonymous: a visitor has no session yet.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("google/start")]
    public async Task<IActionResult> StartGoogle(StartGoogleSignInRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(
            new StartGoogleSignInCommand { App = GoogleApp.Member, Intent = request?.Intent, ReturnUrl = request?.ReturnUrl, SelectAccount = request?.SelectAccount ?? false },
            cancellationToken).ConfigureAwait(false));

    /// <summary>Who is signed in; a visitor is refused 401 by the fallback policy.</summary>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetSessionQuery(), cancellationToken).ConfigureAwait(false));
}

/// <summary>The member app's start: what it is for, where to return and whether to show Google's account chooser.</summary>
public sealed record StartGoogleSignInRequest(string? Intent, string? ReturnUrl, bool SelectAccount);
