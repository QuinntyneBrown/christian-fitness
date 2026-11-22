using ChristianFitness.Application.Account;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>Joining the community (L2-003). Anonymous: a visitor has no session yet (L2-031 AC1).</summary>
[ApiController]
[Route("api/account")]
public sealed class AccountController(ISender sender) : ControllerBase
{
    /// <summary>Creates the account and signs the new member in with the session cookie.</summary>
    [AllowAnonymous]
    [HttpPost("join")]
    public async Task<IActionResult> Join(CreateAccountCommand command, CancellationToken cancellationToken) =>
        Created("/api/session", await sender.Send(command, cancellationToken).ConfigureAwait(false));
}
