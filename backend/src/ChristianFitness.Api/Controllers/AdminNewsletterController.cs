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

    /// <summary>Saves the fields sent and schedules the issue (L2-070 AC5, AC6).</summary>
    [HttpPost("issues/{number:int}/schedule")]
    public async Task<ActionResult<NextIssueDto>> Schedule(int number, ScheduleIssueCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Number = number;
        return await sender.Send(command, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Sends the issue as it stands to the caller's own address only (L2-070 AC9).</summary>
    [HttpPost("issues/{number:int}/test")]
    public async Task<ActionResult<TestSentDto>> SendTest(int number, SendTestIssueCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        command.Number = number;
        return await sender.Send(command, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>The issue as saved, in the web version's shape, for Preview (L2-070 AC9).</summary>
    [HttpGet("issues/{number:int}/preview")]
    public async Task<ActionResult<IssueDto>> Preview(int number, CancellationToken cancellationToken) =>
        await sender.Send(new PreviewIssueQuery(number), cancellationToken).ConfigureAwait(false);

    /// <summary>Makes a Scheduled issue a Draft again (L2-070 AC6).</summary>
    [HttpPost("issues/{number:int}/unschedule")]
    public async Task<ActionResult<NextIssueDto>> Unschedule(int number, CancellationToken cancellationToken) =>
        await sender.Send(new UnscheduleIssueCommand(number), cancellationToken).ConfigureAwait(false);
}
