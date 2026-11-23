using ChristianFitness.Application.Members;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Staff find members (L2-028; ADR 0022) and flag or suspend them (L2-029; ADR 0025). Routed under
/// <c>api/admin/members</c>, so the Members area's policy admits Admins and Moderators (ADR 0020).
/// Each action sends one MediatR request.
/// </summary>
[ApiController]
[Route("api/admin/members")]
public sealed class AdminMembersController(ISender sender) : ControllerBase
{
    /// <summary>
    /// One page of the members whose name or email contains <paramref name="q"/> and whose status is
    /// <paramref name="status"/> (all, active, flagged or suspended), newest joined first.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<MemberListDto>> Search([FromQuery] string? q, [FromQuery] string? status, [FromQuery] int? page, CancellationToken cancellationToken) =>
        await sender.Send(new SearchMembersQuery(q, status, page), cancellationToken).ConfigureAwait(false);

    /// <summary>Flags the member with the body's note and answers their row.</summary>
    [HttpPost("{id:guid}/flag")]
    public async Task<ActionResult<MemberRowDto>> Flag(Guid id, ModerateMemberBody body, CancellationToken cancellationToken) =>
        await sender.Send(new FlagMemberCommand(id, body?.Note), cancellationToken).ConfigureAwait(false);

    /// <summary>Suspends the member with the body's note, once confirmed, and answers their row.</summary>
    [HttpPost("{id:guid}/suspend")]
    public async Task<ActionResult<MemberRowDto>> Suspend(Guid id, ModerateMemberBody body, CancellationToken cancellationToken) =>
        await sender.Send(new SuspendMemberCommand(id, body?.Note, body?.Confirmed), cancellationToken).ConfigureAwait(false);
}

/// <summary>
/// What the moderation dialog sends: the note, and for a suspension that staff confirmed it. A
/// class, not a record, so no generated <c>ToString</c> can print the note.
/// </summary>
public sealed class ModerateMemberBody
{
    public string? Note { get; init; }

    public bool? Confirmed { get; init; }
}
