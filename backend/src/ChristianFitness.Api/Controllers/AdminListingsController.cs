using ChristianFitness.Application.Services;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Controllers;

/// <summary>
/// Staff keep the live listings correct (L2-027; slice 23.1; ADR 0054). Routed under
/// <c>api/admin/services/listings</c>, so the Services area's policy admits Admins only (ADR 0020).
/// Each action sends one MediatR request.
/// </summary>
[ApiController]
[Route("api/admin/services/listings")]
public sealed class AdminListingsController(ISender sender) : ControllerBase
{
    /// <summary>The live listings in name order, at most 50, with how many exist in all.</summary>
    [HttpGet]
    public async Task<ActionResult<AdminListingsDto>> List(CancellationToken cancellationToken) =>
        await sender.Send(new ListAdminListingsQuery(), cancellationToken).ConfigureAwait(false);

    /// <summary>Saves the body's fields on the listing (L2-027 AC1).</summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AdminListingDto>> Update(Guid id, UpdateListingBody body, CancellationToken cancellationToken) =>
        await sender.Send(
            new UpdateListingCommand
            {
                Id = id,
                Name = body?.Name ?? string.Empty,
                Role = body?.Role ?? string.Empty,
                Category = body?.Category ?? string.Empty,
                Where = body?.Where ?? string.Empty,
                Price = body?.Price ?? string.Empty,
                Credentials = body?.Credentials ?? string.Empty,
                About = body?.About ?? string.Empty,
                ContactUrl = body?.ContactUrl,
            },
            cancellationToken).ConfigureAwait(false);

    /// <summary>Removes the listing; 204 when it is gone (L2-027 AC2; ADR 0055).</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Remove(Guid id, CancellationToken cancellationToken)
    {
        await sender.Send(new RemoveListingCommand(id), cancellationToken).ConfigureAwait(false);
        return NoContent();
    }
}

/// <summary>What the listing editor sends. A class, not a record, so no generated <c>ToString</c> can print the values.</summary>
public sealed class UpdateListingBody
{
    public string? Name { get; init; }

    public string? Role { get; init; }

    public string? Category { get; init; }

    public string? Where { get; init; }

    public string? Price { get; init; }

    public string? Credentials { get; init; }

    public string? About { get; init; }

    public string? ContactUrl { get; init; }
}
