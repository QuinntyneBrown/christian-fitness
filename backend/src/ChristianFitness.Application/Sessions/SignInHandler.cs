using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using MediatR;

namespace ChristianFitness.Application.Sessions;

/// <summary>
/// Signs a member in with their email and password (L2-004 AC1; ADR 0009, ADR 0012, ADR 0016). In
/// order:
/// <list type="number">
/// <item>the credentials are checked by <see cref="MemberCredentials"/>, which the admin sign-in
/// shares (ADR 0011): a paused email is refused <c>too_many_attempts</c> (L2-004 AC3), and an
/// unknown email, a wrong password or a blank field <c>invalid_credentials</c> whatever was wrong
/// (L2-004 AC2);</item>
/// <item>a suspended member with the right password is refused <c>account_suspended</c>, so the
/// suspension is told only to whoever knows the password (L2-004 AC4);</item>
/// <item>otherwise the email's failures are cleared and the member is signed in.</item>
/// </list>
/// </summary>
internal sealed class SignInHandler(MemberCredentials credentials, ISessionSignIn session)
    : IRequestHandler<SignInCommand, SessionDto>
{
    public async Task<SessionDto> Handle(SignInCommand request, CancellationToken cancellationToken)
    {
        var member = await credentials.VerifyAsync(request.Email, request.Password, cancellationToken).ConfigureAwait(false);
        if (member.Status == MemberStatus.Suspended)
        {
            throw new RefusalException(RefusalCodes.AccountSuspended, RefusalKind.Forbidden);
        }

        await credentials.ForgetFailuresAsync(request.Email, cancellationToken).ConfigureAwait(false);
        await session.SignInAsync(member).ConfigureAwait(false);
        return new SessionDto(member.Id, member.Name);
    }
}
