using ChristianFitness.Api.Security;
using ChristianFitness.Application.Directory.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// A claim link (L2-078; ADR 0091). Anyone may read one, since a visitor learns only the listing's
/// name and the expiry, held to the public-reads limit (ADR 0072); answering it needs a session. The
/// token is a route value, so a span records the template, never the token. Each action sends one
/// MediatR request and checks nothing.
/// </summary>
[ApiController]
[Route("api/claims/{token}")]
public sealed class ListingClaimsController(ISender sender) : ControllerBase
{
    /// <summary>The listing's name and the link's expiry, and the preview for a signed-in caller.</summary>
    [HttpGet]
    [AllowAnonymous]
    [EnableRateLimiting(PublicReads.Policy)]
    public async Task<ActionResult<ListingClaimDto>> Get(string token, CancellationToken cancellationToken) =>
        await sender.Send(new GetListingClaimQuery(token), cancellationToken).ConfigureAwait(false);

    /// <summary>Publishes the listing as the signed-in member's.</summary>
    [HttpPost("publish")]
    public async Task<ActionResult<ClaimAnswerDto>> Publish(string token, CancellationToken cancellationToken) =>
        await sender.Send(new PublishListingClaimCommand(token), cancellationToken).ConfigureAwait(false);

    /// <summary>Says the listing isn't the signed-in member's; nothing is published.</summary>
    [HttpPost("decline")]
    public async Task<ActionResult<ClaimAnswerDto>> Decline(string token, CancellationToken cancellationToken) =>
        await sender.Send(new DeclineListingClaimCommand(token), cancellationToken).ConfigureAwait(false);
}
