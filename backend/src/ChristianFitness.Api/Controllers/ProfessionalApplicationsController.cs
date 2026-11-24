using ChristianFitness.Application.Services;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// A member applies to be listed on Services (L2-026; slice 22.1; ADR 0000). A visitor is refused
/// 401 by the fallback policy; the handler refuses a second Pending application 409
/// <c>application_pending</c> and a suspended member 403 <c>member_suspended</c>.
/// </summary>
[ApiController]
[Route("api/professional-applications")]
public sealed class ProfessionalApplicationsController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Submit(SubmitApplicationCommand command, CancellationToken cancellationToken)
    {
        var created = await sender.Send(command, cancellationToken).ConfigureAwait(false);
        return StatusCode(StatusCodes.Status201Created, created);
    }
}
