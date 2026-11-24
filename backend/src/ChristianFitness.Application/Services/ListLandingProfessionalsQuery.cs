using ChristianFitness.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Services;

/// <summary>A professional as the public landing page shows one: the public fields of a listing and nothing that identifies or reaches the person (L2-001 AC5; ADR 0000).</summary>
public sealed record LandingProfessionalDto(string Name, string Role, string Category, string Where, string Price);

/// <summary>The first few published listings by name, at most <see cref="Limit"/> (L2-001 AC5 to AC7; ADR 0057).</summary>
public sealed record ListLandingProfessionalsQuery : IRequest<IReadOnlyList<LandingProfessionalDto>>
{
    public const int Limit = 3;
}

internal sealed class ListLandingProfessionalsHandler(IAppDbContext db)
    : IRequestHandler<ListLandingProfessionalsQuery, IReadOnlyList<LandingProfessionalDto>>
{
    public async Task<IReadOnlyList<LandingProfessionalDto>> Handle(ListLandingProfessionalsQuery request, CancellationToken cancellationToken)
    {
        var rows = await db.ServiceListings.AsNoTracking()
            .OrderBy(l => l.Name)
            .ThenBy(l => l.Id)
            .Take(ListLandingProfessionalsQuery.Limit)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return [.. rows.Select(l => new LandingProfessionalDto(l.Name, l.Role, l.Category.ToString(), l.Where, l.Price))];
    }
}
