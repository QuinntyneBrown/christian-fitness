using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Admin;

/// <summary>
/// Who is signed in to the admin app and with which staff role (<c>Admin</c> or <c>Moderator</c>).
/// No contact detail and no password (L2-030 AC1).
/// </summary>
public sealed record StaffSessionDto(Guid MemberId, string Name, string Role)
{
    /// <summary>
    /// The record type an audit entry names for a staff session; its id is the staff member's, since
    /// a session's own key is a secret (ADR 0023).
    /// </summary>
    public const string RecordType = "StaffSession";
}

/// <summary>
/// The password step of staff sign-in to the admin app (L2-018, L2-046 AC1). A class, not a record:
/// a record's generated <c>ToString</c> would print the password if it were ever logged (L2-033 AC2).
/// </summary>
public sealed class StaffSignInCommand : IRequest
{
    public string Email { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;
}

/// <summary>Who is signed in to the admin app (L2-018 AC1; ADR 0011).</summary>
public sealed record GetStaffSessionQuery : IRequest<StaffSessionDto>;

/// <summary>
/// Signing out of the admin app: the staff session ends on the server (L2-018 AC6; ADR 0011). A staff
/// change, audited as <c>staff_session.ended</c> (L2-019 AC3; ADR 0023).
/// </summary>
public sealed record StaffSignOutCommand : IRequest, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "staff_session.ended";
}

/// <summary>
/// Checks the credentials as the member sign-in does, with its pause (L2-018 AC3; ADR 0016); a
/// suspended account with the right password is refused <c>account_suspended</c>, as in the member
/// app (L2-029 AC8; ADR 0028); then the staff role: a member
/// without one is refused with <c>not_staff</c> and no session (L2-018 AC2). Staff without
/// two-step verification set up are refused with <c>two_step_not_set_up</c> (L2-046 AC6). Staff
/// get a pending sign-in, not a session: a <see cref="TwoStepChallenge"/> replacing any earlier one
/// of theirs, named by the step cookie (L2-046 AC1; ADR 0013); only then are the email's sign-in
/// failures forgotten.
/// </summary>
internal sealed class StaffSignInHandler(MemberCredentials credentials, IAppDbContext db, ITwoStepCookie cookie, TimeProvider time)
    : IRequestHandler<StaffSignInCommand>
{
    public async Task Handle(StaffSignInCommand request, CancellationToken cancellationToken)
    {
        var member = await credentials.VerifyAsync(request.Email, request.Password, cancellationToken).ConfigureAwait(false);
        if (member.Status == MemberStatus.Suspended)
        {
            throw new RefusalException(RefusalCodes.AccountSuspended, RefusalKind.Forbidden);
        }

        _ = await StaffRoles.OfAsync(db, member.Id, cancellationToken).ConfigureAwait(false)
            ?? throw StaffRoles.NotStaff();
        if (!await db.StaffTwoSteps.AnyAsync(twoStep => twoStep.MemberId == member.Id, cancellationToken).ConfigureAwait(false))
        {
            throw new RefusalException(RefusalCodes.TwoStepNotSetUp, RefusalKind.Forbidden);
        }

        await credentials.ForgetFailuresAsync(request.Email, cancellationToken).ConfigureAwait(false);
        var earlier = await db.TwoStepChallenges.Where(c => c.MemberId == member.Id).ToListAsync(cancellationToken).ConfigureAwait(false);
        db.TwoStepChallenges.RemoveRange(earlier);
        var (challenge, token) = TwoStepChallenge.Issue(member.Id, time.GetUtcNow());
        db.TwoStepChallenges.Add(challenge);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        cookie.Issue(token, challenge.ExpiresAt);
    }
}

/// <summary>
/// The signed-in staff member. The role is read again, so a role taken away since sign-in is
/// refused with <c>not_staff</c>.
/// </summary>
internal sealed class GetStaffSessionHandler(IAppDbContext db, ICurrentMember current) : IRequestHandler<GetStaffSessionQuery, StaffSessionDto>
{
    public async Task<StaffSessionDto> Handle(GetStaffSessionQuery request, CancellationToken cancellationToken)
    {
        var id = current.Id;
        var role = await StaffRoles.OfAsync(db, id, cancellationToken).ConfigureAwait(false)
            ?? throw StaffRoles.NotStaff();
        var name = await db.Members
            .Where(member => member.Id == id)
            .Select(member => member.Name)
            .SingleAsync(cancellationToken)
            .ConfigureAwait(false);
        return new StaffSessionDto(id, name, role.ToString());
    }
}

/// <summary>Ends the staff session; the audit trail records whose it was, read before it ends.</summary>
internal sealed class StaffSignOutHandler(IStaffSessionSignIn session, ICurrentMember current, AuditTrail audit) : IRequestHandler<StaffSignOutCommand>
{
    public async Task Handle(StaffSignOutCommand request, CancellationToken cancellationToken)
    {
        var id = current.Id;
        await session.SignOutAsync().ConfigureAwait(false);
        audit.Record(id, StaffSessionDto.RecordType, id);
    }
}

/// <summary>Reading a member's staff role, and the refusal when there is none (L2-018 AC2).</summary>
internal static class StaffRoles
{
    public static Task<StaffRoleName?> OfAsync(IAppDbContext db, Guid memberId, CancellationToken cancellationToken) =>
        db.StaffRoles
            .Where(role => role.MemberId == memberId)
            .Select(role => (StaffRoleName?)role.Name)
            .SingleOrDefaultAsync(cancellationToken);

    public static RefusalException NotStaff() => new(RefusalCodes.NotStaff, RefusalKind.Forbidden);
}
