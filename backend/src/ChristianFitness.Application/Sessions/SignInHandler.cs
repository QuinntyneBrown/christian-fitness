using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Sessions;

/// <summary>
/// Signs a member in with their email and password (L2-004 AC1; ADR 0009). An unknown email, a
/// wrong password and a blank field are all refused with
/// <c>invalid_credentials</c>, so the answer never says which was wrong (L2-004 AC2). An unknown
/// email is checked against a fixed hash, so it takes as long as a wrong password.
/// </summary>
internal sealed class SignInHandler(IAppDbContext db, IPasswordHasherService hasher, ISessionSignIn session)
    : IRequestHandler<SignInCommand, SessionDto>
{
    /// <summary>A hash of a random password, made once, checked when no account has the email.</summary>
    private static string? _unknownMemberHash;

    public async Task<SessionDto> Handle(SignInCommand request, CancellationToken cancellationToken)
    {
        var email = request.Email ?? string.Empty;
        var password = request.Password ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email) || password.Length == 0)
        {
            throw Refused();
        }

        var normalizedEmail = Member.NormalizeEmail(email);
        var member = await db.Members
            .SingleOrDefaultAsync(m => m.NormalizedEmail == normalizedEmail, cancellationToken)
            .ConfigureAwait(false);
        var verified = hasher.Verify(member?.PasswordHash ?? (_unknownMemberHash ??= hasher.Hash(Guid.NewGuid().ToString("N"))), password);
        if (member is null || !verified)
        {
            throw Refused();
        }

        await session.SignInAsync(member).ConfigureAwait(false);
        return new SessionDto(member.Id, member.Name);
    }

    private static RefusalException Refused() =>
        new(RefusalCodes.InvalidCredentials, RefusalKind.Unauthenticated);
}
