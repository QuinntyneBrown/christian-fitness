using ChristianFitness.Api.Security;
using ChristianFitness.Application.Directory;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The directory (L2-054, L2-055; ADR 0082, ADR 0087). Anyone may read the list and a profile, since
/// they answer only what published listings publish, and an anonymous caller is held to the
/// public-reads limit (ADR 0072). Messaging, following and unfollowing a listing need a session.
/// </summary>
[ApiController]
[Route("api/directory")]
public sealed class DirectoryController(ISender sender) : ControllerBase
{
    /// <summary>One page of the published listings in kind and name order, or of one kind, matching a search, with each kind's count.</summary>
    [HttpGet]
    [AllowAnonymous]
    [EnableRateLimiting(PublicReads.Policy)]
    public async Task<IActionResult> List([FromQuery] string? kind, [FromQuery] string? q, [FromQuery] string? cursor, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ListDirectoryQuery(kind, q, cursor), cancellationToken).ConfigureAwait(false));

    /// <summary>One published listing's profile (L2-055).</summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [EnableRateLimiting(PublicReads.Policy)]
    public async Task<ActionResult<ListingProfileDto>> Get(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new GetListingProfileQuery(id), cancellationToken).ConfigureAwait(false);

    /// <summary>The member to open the direct conversation with when messaging a listing: its owner (L2-055 AC6).</summary>
    [HttpPost("{id:guid}/conversation")]
    public async Task<ActionResult<ListingConversationDto>> StartConversation(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new StartListingConversationCommand(id), cancellationToken).ConfigureAwait(false);

    /// <summary>The signed-in member follows a listing; a repeat changes nothing (L2-056; ADR 0088).</summary>
    [HttpPut("{id:guid}/follow")]
    public async Task<ActionResult<ListingFollowDto>> Follow(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new FollowListingCommand(id), cancellationToken).ConfigureAwait(false);

    /// <summary>The signed-in member stops following a listing; a repeat changes nothing (L2-056; ADR 0088).</summary>
    [HttpDelete("{id:guid}/follow")]
    public async Task<ActionResult<ListingFollowDto>> Unfollow(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new UnfollowListingCommand(id), cancellationToken).ConfigureAwait(false);
}
