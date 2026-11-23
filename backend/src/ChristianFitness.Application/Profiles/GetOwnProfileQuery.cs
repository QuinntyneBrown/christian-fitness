using ChristianFitness.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Profiles;

/// <summary>The signed-in member's own profile (L2-005 AC1, AC2; ADR 0015).</summary>
public sealed record GetOwnProfileQuery : IRequest<OwnProfileDto>;

/// <summary>
/// Reads only the session's member, never one a request names, and the events they are going to
/// from now on, soonest first, as <see cref="IRegistrationReader"/> gives them. It logs nothing: the
/// home church and bio are never in a log or span (L2-033 AC2).
/// </summary>
internal sealed class GetOwnProfileHandler(IAppDbContext db, ICurrentMember current, IRegistrationReader registrations, TimeProvider time)
    : IRequestHandler<GetOwnProfileQuery, OwnProfileDto>
{
    public async Task<OwnProfileDto> Handle(GetOwnProfileQuery request, CancellationToken cancellationToken)
    {
        var id = current.Id;
        var member = await db.Members.AsNoTracking().SingleAsync(m => m.Id == id, cancellationToken).ConfigureAwait(false);
        var upcoming = await registrations.UpcomingForAsync(id, time.GetUtcNow(), cancellationToken).ConfigureAwait(false);
        return new OwnProfileDto(
            member.Name,
            member.City,
            member.JoinedAt,
            member.Bio,
            member.HomeChurch,
            member.Goals,
            member.Interests,
            upcoming);
    }
}
