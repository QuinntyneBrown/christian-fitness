using System.Text.Json.Serialization;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Profiles;

/// <summary>Another member's profile, by the id the URL wrote (L2-005 AC3; ADR 0038).</summary>
public sealed record GetPublicProfileQuery(string MemberId) : IRequest<PublicProfileDto>;

/// <summary>
/// What members see of one another: name, bio and interests, and the home church only when its owner
/// chose to show it. There is no email, city, goals or join date field, so none can leak; a hidden
/// home church is absent from the answer, not null.
/// </summary>
public sealed record PublicProfileDto(
    string Name,
    string? Bio,
    IReadOnlyList<string> Interests,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? HomeChurch)
{
    /// <summary>The public view of <paramref name="member"/>.</summary>
    public static PublicProfileDto Of(Member member)
    {
        ArgumentNullException.ThrowIfNull(member);
        return new PublicProfileDto(member.Name, member.Bio, member.Interests, member.ShowHomeChurch ? member.HomeChurch : null);
    }
}

/// <summary>An id that names nobody, or is not an id, is 404. It logs nothing (L2-033 AC2).</summary>
internal sealed class GetPublicProfileHandler(IAppDbContext db) : IRequestHandler<GetPublicProfileQuery, PublicProfileDto>
{
    public async Task<PublicProfileDto> Handle(GetPublicProfileQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!Guid.TryParse(request.MemberId, out var id))
        {
            throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        }

        var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        return PublicProfileDto.Of(member);
    }
}
