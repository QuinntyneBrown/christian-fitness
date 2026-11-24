using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Services;

/// <summary>
/// Creates a Pending application for the signed-in member (L2-026 AC1; ADR 0047). A suspended
/// member is refused <c>member_suspended</c> (403); a member who already has a Pending application
/// is refused <c>application_pending</c> (409, AC2). A declined application does not block a new
/// one. It logs nothing (L2-033).
/// </summary>
internal sealed class SubmitApplicationHandler(IAppDbContext db, ICurrentMember current, TimeProvider time)
    : IRequestHandler<SubmitApplicationCommand, ApplicationDto>
{
    public async Task<ApplicationDto> Handle(SubmitApplicationCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var id = current.Id;
        var status = await db.Members.AsNoTracking().Where(m => m.Id == id).Select(m => m.Status).SingleAsync(cancellationToken).ConfigureAwait(false);
        if (status == MemberStatus.Suspended)
        {
            throw new RefusalException(RefusalCodes.MemberSuspended, RefusalKind.Forbidden);
        }

        var pending = await db.ProfessionalApplications.AsNoTracking()
            .AnyAsync(a => a.MemberId == id && a.Status == ApplicationStatus.Pending, cancellationToken).ConfigureAwait(false);
        if (pending)
        {
            throw new RefusalException(RefusalCodes.ApplicationPending, RefusalKind.Conflict);
        }

        SubmitApplicationValidator.TryCategory(request.Category, out var category);
        var application = ProfessionalApplication.Submit(
            id, request.Role, category, request.Credentials, request.Where, request.Price, request.About, time.GetUtcNow());
        db.ProfessionalApplications.Add(application);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return ApplicationDto.Of(application);
    }
}
