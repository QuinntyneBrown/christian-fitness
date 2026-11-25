using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Directory;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Admin;

/// <summary>
/// The work waiting behind each area of the console's navigation (ADR 0079): for now how many
/// listing suggestions wait for review (L2-073 AC1; ADR 0090). Later journeys add the other areas.
/// </summary>
public sealed record AdminCountsDto(int Suggestions);

/// <summary>Staff ask what waits behind the navigation's areas.</summary>
public sealed record GetAdminCountsQuery : IRequest<AdminCountsDto>;

/// <summary>Counts the undecided suggestions; both roles review them, so both get the count.</summary>
internal sealed class GetAdminCountsHandler(IAppDbContext db) : IRequestHandler<GetAdminCountsQuery, AdminCountsDto>
{
    public async Task<AdminCountsDto> Handle(GetAdminCountsQuery request, CancellationToken cancellationToken) =>
        new(await db.ListingSuggestions.AsNoTracking()
            .CountAsync(s => s.Status == SuggestionStatus.Waiting, cancellationToken).ConfigureAwait(false));
}
