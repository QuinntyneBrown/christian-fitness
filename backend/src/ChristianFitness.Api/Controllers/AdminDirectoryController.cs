using ChristianFitness.Application.Directory.Claims;
using ChristianFitness.Application.Directory.Review;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Staff review listing suggestions and edit what is listed (L2-073; journey 18; ADR 0090). Routed under
/// <c>api/admin/directory</c>, the Directory area an Admin and a Moderator open (ADR 0064). The name
/// avoids <see cref="AdminListingsController"/>, which serves Services listings. Each action sends one
/// MediatR request and checks nothing.
/// </summary>
[ApiController]
[Route("api/admin/directory")]
public sealed class AdminDirectoryController(ISender sender) : ControllerBase
{
    /// <summary>The waiting and recently decided suggestions, oldest first, 50 after <paramref name="after"/>.</summary>
    [HttpGet("suggestions")]
    public async Task<ActionResult<SuggestionListDto>> Suggestions([FromQuery] Guid? after, CancellationToken cancellationToken) =>
        await sender.Send(new ListListingSuggestionsQuery(after), cancellationToken).ConfigureAwait(false);

    /// <summary>One suggestion with its four checks.</summary>
    [HttpGet("suggestions/{id:guid}")]
    public async Task<ActionResult<SuggestionDetailDto>> Suggestion(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new GetListingSuggestionQuery(id), cancellationToken).ConfigureAwait(false);

    /// <summary>Ticks or unticks one check and answers the four.</summary>
    [HttpPut("suggestions/{id:guid}/checks/{check}")]
    public async Task<ActionResult<SuggestionChecksDto>> SetCheck(Guid id, string check, SetCheckBody body, CancellationToken cancellationToken) =>
        await sender.Send(new SetSuggestionCheckCommand(id, check, body?.Passed ?? false), cancellationToken).ConfigureAwait(false);

    /// <summary>Approves a suggestion whose four checks passed.</summary>
    [HttpPost("suggestions/{id:guid}/approve")]
    public async Task<ActionResult<SuggestionDecisionDto>> Approve(Guid id, CancellationToken cancellationToken) =>
        await sender.Send(new ApproveSuggestionCommand(id), cancellationToken).ConfigureAwait(false);

    /// <summary>Declines a suggestion, with an optional reason kept for staff.</summary>
    [HttpPost("suggestions/{id:guid}/decline")]
    public async Task<ActionResult<SuggestionDecisionDto>> Decline(Guid id, [FromBody] DeclineSuggestionBody? body, CancellationToken cancellationToken) =>
        await sender.Send(new DeclineSuggestionCommand(id, body?.Reason), cancellationToken).ConfigureAwait(false);

    /// <summary>Sends a new claim link for an approved suggestion; the old one stops working (ADR 0092).</summary>
    [HttpPost("suggestions/{id:guid}/claim-link")]
    public async Task<IActionResult> ResendClaimLink(Guid id, CancellationToken cancellationToken)
    {
        await sender.Send(new ResendClaimLinkCommand(id), cancellationToken).ConfigureAwait(false);
        return NoContent();
    }

    /// <summary>The published listings in name order, 50 after <paramref name="after"/>.</summary>
    [HttpGet("listings")]
    public async Task<ActionResult<ListedListingsDto>> Listings([FromQuery] Guid? after, CancellationToken cancellationToken) =>
        await sender.Send(new ListListedListingsQuery(after), cancellationToken).ConfigureAwait(false);

    /// <summary>Saves the staff editor's fields and answers the listing as saved.</summary>
    [HttpPut("listings/{id:guid}")]
    public async Task<ActionResult<ListedListingDto>> UpdateListing(Guid id, DirectoryListingBody body, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(body);
        return await sender.Send(
            new UpdateDirectoryListingCommand(
                id, body.Name, body.Kind, body.Area, body.Tagline, body.About, body.Website, body.PhotoKey, body.Focus, body.ContactEmail),
            cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Approves the name and kind an owner asked for (ADR 0095).</summary>
    [HttpPost("listings/{id:guid}/change/approve")]
    public Task<ListedListingDto> ApproveChange(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new ApproveListingChangeCommand(id), cancellationToken);

    /// <summary>Declines the name and kind an owner asked for (ADR 0095).</summary>
    [HttpPost("listings/{id:guid}/change/decline")]
    public Task<ListedListingDto> DeclineChange(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new DeclineListingChangeCommand(id), cancellationToken);

    /// <summary>Stores one listing photo and answers 201 with its key. Larger bodies than the limit are refused before this runs.</summary>
    [HttpPost("photos")]
    [RequestSizeLimit(PhotoBodyLimit)]
    [RequestFormLimits(MultipartBodyLengthLimit = PhotoBodyLimit)]
    public async Task<IActionResult> UploadPhoto(IFormFile file, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(file);
        await using var content = file.OpenReadStream();
        return StatusCode(StatusCodes.Status201Created, await sender.Send(new UploadListingPhotoCommand(content, file.Length), cancellationToken).ConfigureAwait(false));
    }

    /// <summary>Room above the 5 MB photo limit, so a larger photo is refused by the rule with its code, not by the server.</summary>
    private const int PhotoBodyLimit = 10 * 1024 * 1024;
}

/// <summary>What the staff listing editor sends.</summary>
public sealed class DirectoryListingBody
{
    public string? Name { get; init; }

    public string? Kind { get; init; }

    public string? Area { get; init; }

    public string? Tagline { get; init; }

    public string? About { get; init; }

    public string? Website { get; init; }

    public string? PhotoKey { get; init; }

    public IReadOnlyList<string>? Focus { get; init; }

    public string? ContactEmail { get; init; }
}

/// <summary>What a tick sends.</summary>
public sealed class SetCheckBody
{
    public bool Passed { get; init; }
}

/// <summary>What a decline sends: an optional reason kept for staff.</summary>
public sealed class DeclineSuggestionBody
{
    public string? Reason { get; init; }
}
