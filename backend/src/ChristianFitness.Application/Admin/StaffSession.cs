using ChristianFitness.Application.Abstractions;
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
public sealed record StaffSessionDto(Guid MemberId, string Name, string Role);

/// <summary>
/// Staff sign-in to the admin app (L2-018). A class, not a record: a record's generated
/// <c>ToString</c> would print the password if it were ever logged (L2-033 AC2).
/// </summary>
public sealed class StaffSignInCommand : IRequest<StaffSessionDto>
{
    public string Email { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;
}

/// <summary>Who is signed in to the admin app (L2-018 AC1; ADR 0010).</summary>
public sealed record GetStaffSessionQuery : IRequest<StaffSessionDto>;

/// <summary>Signing out of the admin app: the staff session ends on the server (L2-018 AC6; ADR 0010).</summary>
public sealed record StaffSignOutCommand : IRequest;

/// <summary>
/// Checks the credentials as the member sign-in does (L2-018 AC3), then the staff role: a member
/// without one is refused with <c>not_staff</c> and no session (L2-018 AC2); staff get the admin
/// session (L2-018 AC1; ADR 0010).
/// </summary>
internal sealed class StaffSignInHandler(MemberCredentials credentials, IAppDbContext db, IStaffSessionSignIn session)
    : IRequestHandler<StaffSignInCommand, StaffSessionDto>
{
    public async Task<StaffSessionDto> Handle(StaffSignInCommand request, CancellationToken cancellationToken)
    {
        var member = await credentials.VerifyAsync(request.Email, request.Password, cancellationToken).ConfigureAwait(false);
        var role = await StaffRoles.OfAsync(db, member.Id, cancellationToken).ConfigureAwait(false)
            ?? throw StaffRoles.NotStaff();
        await session.SignInAsync(member, role).ConfigureAwait(false);
        return new StaffSessionDto(member.Id, member.Name, role.ToString());
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

internal sealed class StaffSignOutHandler(IStaffSessionSignIn session) : IRequestHandler<StaffSignOutCommand>
{
    public Task Handle(StaffSignOutCommand request, CancellationToken cancellationToken) => session.SignOutAsync();
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
