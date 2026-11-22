using ChristianFitness.Application.Abstractions;
using MediatR;

namespace ChristianFitness.Application.Sessions;

/// <summary>
/// Signs a member in with their email and password (L2-004 AC1; ADR 0009). The credentials are
/// checked by <see cref="MemberCredentials"/>, which the admin sign-in shares (ADR 0010), so the
/// refusal is <c>invalid_credentials</c> whatever was wrong (L2-004 AC2).
/// </summary>
internal sealed class SignInHandler(MemberCredentials credentials, ISessionSignIn session)
    : IRequestHandler<SignInCommand, SessionDto>
{
    public async Task<SessionDto> Handle(SignInCommand request, CancellationToken cancellationToken)
    {
        var member = await credentials.VerifyAsync(request.Email, request.Password, cancellationToken).ConfigureAwait(false);
        await session.SignInAsync(member).ConfigureAwait(false);
        return new SessionDto(member.Id, member.Name);
    }
}
