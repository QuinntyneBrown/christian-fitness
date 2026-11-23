using ChristianFitness.Application.Account;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>Joining the community (L2-003), asking for a reset link (L2-044) and choosing a new password (L2-045). Anonymous: a visitor has no session yet (L2-031 AC1).</summary>
[ApiController]
[Route("api/account")]
public sealed class AccountController(ISender sender) : ControllerBase
{
    /// <summary>Creates the account and signs the new member in with the session cookie.</summary>
    [AllowAnonymous]
    [HttpPost("join")]
    public async Task<IActionResult> Join(CreateAccountCommand command, CancellationToken cancellationToken) =>
        Created("/api/session", await sender.Send(command, cancellationToken).ConfigureAwait(false));

    /// <summary>
    /// Sends a reset link when the email has an account (L2-044; ADR 0010). The answer is 202 with
    /// no body either way, so it never says whether the email is registered.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("password-reset")]
    public async Task<IActionResult> RequestPasswordReset(RequestPasswordResetCommand command, CancellationToken cancellationToken)
    {
        await sender.Send(command, cancellationToken).ConfigureAwait(false);
        return Accepted();
    }

    /// <summary>
    /// Answers the email of the account a usable reset link belongs to (L2-045 AC1; ADR 0012). The
    /// token travels in the body, never in a URL.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("password-reset/check")]
    public async Task<ActionResult<PasswordResetCheckDto>> CheckPasswordReset(CheckPasswordResetQuery query, CancellationToken cancellationToken) =>
        await sender.Send(query, cancellationToken).ConfigureAwait(false);

    /// <summary>Sets a new password through a usable reset link and answers 204 (L2-045 AC2; ADR 0012).</summary>
    [AllowAnonymous]
    [HttpPost("password-reset/complete")]
    public async Task<IActionResult> CompletePasswordReset(CompletePasswordResetCommand command, CancellationToken cancellationToken)
    {
        await sender.Send(command, cancellationToken).ConfigureAwait(false);
        return NoContent();
    }
}
