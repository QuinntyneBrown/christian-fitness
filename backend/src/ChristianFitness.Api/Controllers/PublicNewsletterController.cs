using ChristianFitness.Application.Newsletter;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The Abundant Weekly for anyone, with no account (L2-057, L2-058; ADR 0110). Each action sends one
/// request; the handlers decide everything.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/public/newsletter")]
public sealed class PublicNewsletterController(ISender sender) : ControllerBase
{
    /// <summary>
    /// Subscribes an address with double opt-in (L2-057 AC4, AC5). The answer is 202 with no body
    /// whatever the address's standing, so it never says whether an address is subscribed.
    /// </summary>
    [HttpPost("subscriptions")]
    public async Task<IActionResult> Subscribe(SubscribeCommand command, CancellationToken cancellationToken)
    {
        await sender.Send(command, cancellationToken).ConfigureAwait(false);
        return Accepted();
    }

    /// <summary>
    /// Follows a confirmation link (L2-058 AC2, AC3): the address and when its first issue arrives, or
    /// 400 <c>subscription_link_expired</c>. The token travels in the body, never in a URL.
    /// </summary>
    [HttpPost("confirmations")]
    public async Task<ActionResult<SubscriptionConfirmedDto>> Confirm(ConfirmSubscriptionCommand command, CancellationToken cancellationToken) =>
        await sender.Send(command, cancellationToken).ConfigureAwait(false);

    /// <summary>
    /// Follows an Unsubscribe link from Subscribe (L2-058 AC5): the address, or none for a token
    /// that names nothing. It never refuses.
    /// </summary>
    [HttpPost("unsubscriptions")]
    public async Task<ActionResult<UnsubscribedDto>> Unsubscribe(UnsubscribeCommand command, CancellationToken cancellationToken) =>
        await sender.Send(command, cancellationToken).ConfigureAwait(false);

    /// <summary>
    /// The one-click address of <c>List-Unsubscribe</c> (RFC 8058; L2-058 AC4, AC5): a mail client
    /// posts <c>List-Unsubscribe=One-Click</c> here from no page of the app, so no antiforgery token is
    /// asked for; the token is its only credential. 200 with no body, for any token.
    /// </summary>
    [HttpPost("unsubscribe")]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> OneClickUnsubscribe([FromQuery] string? token, CancellationToken cancellationToken)
    {
        await sender.Send(new UnsubscribeCommand { Token = token ?? string.Empty }, cancellationToken).ConfigureAwait(false);
        return Ok();
    }

    /// <summary>The latest sent issue as the web shows it, or 404 <c>not_found</c> (L2-059 AC1, AC4).</summary>
    [HttpGet("issues/latest")]
    public async Task<ActionResult<IssueDto>> LatestIssue(CancellationToken cancellationToken) =>
        await sender.Send(new GetIssueQuery(null), cancellationToken).ConfigureAwait(false);

    /// <summary>The sent issue with that number, or 404 <c>not_found</c> (L2-059 AC1, AC4).</summary>
    [HttpGet("issues/{number:int}")]
    public async Task<ActionResult<IssueDto>> Issue(int number, CancellationToken cancellationToken) =>
        await sender.Send(new GetIssueQuery(number), cancellationToken).ConfigureAwait(false);
}
