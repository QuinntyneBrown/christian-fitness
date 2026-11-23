using ChristianFitness.Application.Admin;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The staff session of the admin app: sign in with a password and a code, who is signed in, sign
/// out (L2-018, L2-046; ADR 0011, ADR 0012). Routed under <c>api/admin</c>, so every action but the
/// two sign-in steps requires the Staff policy.
/// </summary>
[ApiController]
[Route("api/admin/session")]
public sealed class StaffSessionController(ISender sender) : ControllerBase
{
    /// <summary>
    /// The password step: 202 with the step cookie and no session; the code comes next. Anonymous:
    /// nobody is signed in yet.
    /// </summary>
    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> SignIn(StaffSignInCommand command, CancellationToken cancellationToken)
    {
        await sender.Send(command, cancellationToken).ConfigureAwait(false);
        return Accepted();
    }

    /// <summary>The second step: the authenticator's code starts the staff session. Anonymous, like the password step.</summary>
    [AllowAnonymous]
    [HttpPost("two-step")]
    public async Task<IActionResult> VerifyTwoStep(VerifyTwoStepCommand command, CancellationToken cancellationToken) =>
        Ok(await sender.Send(command, cancellationToken).ConfigureAwait(false));

    /// <summary>Who is signed in to the admin app.</summary>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetStaffSessionQuery(), cancellationToken).ConfigureAwait(false));

    /// <summary>Signs staff out: the session ends on the server and its cookie expires.</summary>
    [HttpDelete]
    public async Task<IActionResult> SignOut(CancellationToken cancellationToken)
    {
        await sender.Send(new StaffSignOutCommand(), cancellationToken).ConfigureAwait(false);
        return NoContent();
    }
}
