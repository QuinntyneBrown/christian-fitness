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
    /// <summary>One page of members, newest joined first.</summary>
    [HttpGet]
    public async Task<ActionResult<MemberListDto>> Search([FromQuery] int? page, CancellationToken cancellationToken) =>
        await sender.Send(new SearchMembersQuery(page), cancellationToken).ConfigureAwait(false);
}
