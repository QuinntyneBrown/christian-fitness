using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.News;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.News;

/// <summary>
/// One byline as Bylines shows it and its editor starts from (L2-077 AC1; ADR 0093): the name, the
/// short bio, the photo's key or none, and how many stories use it, as a number the app words.
/// </summary>
public sealed record BylineDto(Guid Id, string Name, string Bio, string? PhotoKey, int Stories);

/// <summary>Every byline in name order, without regard to case (ADR 0093).</summary>
public sealed record BylineListDto(IReadOnlyList<BylineDto> Bylines);

/// <summary>Bylines (L2-077 AC1): every byline. A staff-kept list of tens, so it is not paged (ADR 0093).</summary>
public sealed record ListBylinesQuery : IRequest<BylineListDto>;

/// <summary>Reads a byline's answer: the byline and how many stories hold it.</summary>
internal static class BylineAnswers
{
    /// <summary>The audit record type of a byline (ADR 0023, ADR 0093); the seed reads it too.</summary>
    public const string RecordType = nameof(Byline);

    public static BylineDto Of(Byline byline, int stories) => new(byline.Id, byline.Name, byline.Bio, byline.PhotoKey, stories);

    /// <summary>How many stories hold <paramref name="bylineId"/>.</summary>
    public static Task<int> StoriesOfAsync(IAppDbContext db, Guid bylineId, CancellationToken cancellationToken) =>
        db.Stories.CountAsync(s => s.BylineId == bylineId, cancellationToken);
}

internal sealed class ListBylinesHandler(IAppDbContext db) : IRequestHandler<ListBylinesQuery, BylineListDto>
{
    public async Task<BylineListDto> Handle(ListBylinesQuery request, CancellationToken cancellationToken)
    {
        var bylines = await db.Bylines.AsNoTracking()
            .OrderBy(b => b.NameKey).ThenBy(b => b.Id)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        var counts = await db.Stories.AsNoTracking()
            .GroupBy(s => s.BylineId)
            .Select(g => new { BylineId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.BylineId, g => g.Count, cancellationToken).ConfigureAwait(false);
        return new BylineListDto([.. bylines.Select(b => BylineAnswers.Of(b, counts.GetValueOrDefault(b.Id)))]);
    }
}
