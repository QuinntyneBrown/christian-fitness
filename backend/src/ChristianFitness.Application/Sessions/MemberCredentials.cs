using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Sessions;

/// <summary>
/// The credential check every sign-in makes, the member app's and the admin app's (L2-004 AC2,
/// L2-018 AC3; ADR 0009, ADR 0011). An unknown email, a wrong password and a blank field are all
/// refused with <c>invalid_credentials</c>, so the answer never says which was wrong. An unknown
/// email is checked against a fixed hash, so it takes as long as a wrong password.
/// </summary>
internal sealed class MemberCredentials(IAppDbContext db, IPasswordHasherService hasher)
{
    /// <summary>A hash of a random password, made once, checked when no account has the email.</summary>
    private static string? _unknownMemberHash;

    /// <summary>The member whose email and password these are; anything else throws the refusal.</summary>
    public async Task<Member> VerifyAsync(string? email, string? password, CancellationToken cancellationToken)
    {
        email ??= string.Empty;
        password ??= string.Empty;
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

        return member;
    }

    private static RefusalException Refused() =>
        new(RefusalCodes.InvalidCredentials, RefusalKind.Unauthenticated);
}
