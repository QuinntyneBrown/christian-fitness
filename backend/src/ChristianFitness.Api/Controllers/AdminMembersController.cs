using ChristianFitness.Application.Members;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Staff find members (L2-028; ADR 0022). Routed under <c>api/admin/members</c>, so the Members
/// area's policy admits Admins and Moderators (ADR 0020). The action sends one MediatR request.
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
}
