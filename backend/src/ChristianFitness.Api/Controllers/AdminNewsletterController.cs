using ChristianFitness.Application.Newsletter;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The console's Newsletter desk (L2-070), routed under <c>api/admin/newsletter</c>, the Newsletter
/// area, which a Moderator uses as an Admin does (L2-070 AC12; ADR 0064). Each action sends one
/// MediatR request and checks nothing.
/// </summary>
[ApiController]
[Route("api/admin/newsletter")]
public sealed class AdminNewsletterController(ISender sender) : ControllerBase
{
    /// <summary>The newsletter's name, confirmed subscribers, send time and next issue (L2-070 AC1).</summary>
    [HttpGet]
    public async Task<ActionResult<NewsletterDeskDto>> Desk(CancellationToken cancellationToken) =>
        await sender.Send(new GetNewsletterDeskQuery(), cancellationToken).ConfigureAwait(false);

    /// <summary>Saves a Draft issue as it stands and answers when (L2-070 AC14).</summary>
    [HttpPut("issues/{number:int}")]
    public async Task<ActionResult<IssueSavedDto>> Save(int number, SaveIssueCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Number = number;
        return await sender.Send(command, cancellationToken).ConfigureAwait(false);
    }
}
