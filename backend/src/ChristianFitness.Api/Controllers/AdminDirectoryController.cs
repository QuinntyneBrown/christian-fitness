using ChristianFitness.Application.Directory.Review;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Staff review listing suggestions and edit what is listed (L2-073; journey 18; ADR 0087). Routed under
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
}

/// <summary>What a tick sends.</summary>
public sealed class SetCheckBody
{
    public bool Passed { get; init; }
}
