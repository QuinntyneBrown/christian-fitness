using ChristianFitness.Application.Admin;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The staff session of the admin app: sign in, who is signed in, sign out (L2-018; ADR 0011).
/// Routed under <c>api/admin</c>, so every action but the sign-in requires the Staff policy.
/// </summary>
[ApiController]
[Route("api/admin/session")]
public sealed class StaffSessionController(ISender sender) : ControllerBase
{
    /// <summary>Signs staff in with the staff session cookie. Anonymous: nobody is signed in yet.</summary>
    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> SignIn(StaffSignInCommand command, CancellationToken cancellationToken) =>
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
