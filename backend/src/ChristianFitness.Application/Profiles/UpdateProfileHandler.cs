using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Profiles;

/// <summary>
/// Saves the session's own member and answers the profile as saved (L2-006 AC2; ADR 0024). Any
/// other id, one that names nobody or one that is not an id at all, is refused 403 before anything
/// is read, so the answer reveals nothing (AC5, L2-031 AC3). It logs nothing (L2-033 AC2).
/// </summary>
internal sealed class UpdateProfileHandler(IAppDbContext db, ICurrentMember current, IRegistrationReader registrations, TimeProvider time)
    : IRequestHandler<UpdateProfileCommand, OwnProfileDto>
{
    public async Task<OwnProfileDto> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var id = current.Id;
        if (!Guid.TryParse(request.MemberId, out var target) || target != id)
        {
            throw new RefusalException(RefusalCodes.Forbidden, RefusalKind.Forbidden);
        }

        var member = await db.Members.SingleAsync(m => m.Id == id, cancellationToken).ConfigureAwait(false);
        member.EditProfile(request.Name, request.City, request.HomeChurch, request.Bio, request.Goals, request.Interests);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        var upcoming = await registrations.UpcomingForAsync(id, time.GetUtcNow(), cancellationToken).ConfigureAwait(false);
        return OwnProfileDto.Of(member, upcoming);
    }
}
