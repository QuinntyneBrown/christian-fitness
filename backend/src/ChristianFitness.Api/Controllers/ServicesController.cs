using ChristianFitness.Application.Services;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// The professionals a signed-in member browses (L2-013; ADR 0000). A visitor is refused 401 by the
/// fallback policy; staff manage listings through the admin controllers.
/// </summary>
[ApiController]
[Route("api/services")]
public sealed class ServicesController(ISender sender) : ControllerBase
{
    /// <summary>The published listings, of one category when asked, in a stable order.</summary>
    [HttpGet]
    public async Task<ActionResult<ServiceListingsDto>> List([FromQuery] string? category, CancellationToken cancellationToken) =>
        await sender.Send(new ListServicesQuery(category), cancellationToken).ConfigureAwait(false);

    /// <summary>One published listing in full (L2-013 AC4; ADR 0052).</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ServiceListingDto>> Get(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new GetServiceQuery(id), cancellationToken).ConfigureAwait(false);

    /// <summary>Message: the direct conversation with the listing's professional (L2-014 AC1; ADR 0053).</summary>
    [HttpPost("{id:guid}/conversation")]
    public async Task<ActionResult<ProfessionalConversationDto>> Conversation(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new StartProfessionalConversationCommand(id), cancellationToken).ConfigureAwait(false);

    /// <summary>Contact: the professional's published contact link, served only when asked (L2-014 AC2; ADR 0053).</summary>
    [HttpGet("{id:guid}/contact-link")]
    public async Task<ActionResult<ContactLinkDto>> ContactLink(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new GetContactLinkQuery(id), cancellationToken).ConfigureAwait(false);

    /// <summary>Request a booking: delivered to the professional as a direct message (L2-014 AC3; ADR 0054).</summary>
    [HttpPost("{id:guid}/booking-requests")]
    public async Task<ActionResult<BookingRequestDto>> RequestBooking(Guid id, [FromBody] RequestBookingBody body, CancellationToken cancellationToken)
    {
        var sent = await sender.Send(new RequestBookingCommand { ListingId = id, Kind = body.Kind, When = body.When, Message = body.Message }, cancellationToken).ConfigureAwait(false);
        return StatusCode(StatusCodes.Status201Created, sent);
    }
}

/// <summary>The booking dialog's values.</summary>
public sealed record RequestBookingBody(string Kind = "", string When = "", string? Message = null);
