using ChristianFitness.Application.Preferences;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The signed-in member's preferences (L2-064), under the fallback policy: a member reads and saves
/// only their own. Each action sends one MediatR request and checks nothing.
/// </summary>
[ApiController]
[Route("api/preferences")]
public sealed class PreferencesController(ISender sender) : ControllerBase
{
    /// <summary>The member's name, email switches and notification switches.</summary>
    [HttpGet]
    public async Task<ActionResult<PreferencesDto>> Get(CancellationToken cancellationToken) =>
        await sender.Send(new GetPreferencesQuery(), cancellationToken).ConfigureAwait(false);

    /// <summary>Saves every setting sent, together, and answers them as saved (L2-064 AC6).</summary>
    [HttpPut]
    public async Task<ActionResult<PreferencesDto>> Save(SavePreferencesCommand command, CancellationToken cancellationToken) =>
        await sender.Send(command, cancellationToken).ConfigureAwait(false);
}
