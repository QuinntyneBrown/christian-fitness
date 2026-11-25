using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Sessions;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Sessions;

/// <summary>
/// The credential check every sign-in makes, the member app's and the admin app's (L2-004 AC2 and
/// AC3, L2-018 AC3; ADR 0009, ADR 0011, ADR 0012, ADR 0016). In order:
/// <list type="number">
/// <item>a blank field is refused <c>invalid_credentials</c> and not recorded;</item>
/// <item>with <see cref="SignInFailure.Attempts"/> full, 5 failures for the email in the last 15
/// minutes in either app, the attempt is refused <c>too_many_attempts</c> before the password is
/// checked, and not recorded, so the pause cannot be lengthened by trying on;</item>
/// <item>an unknown email or a wrong password is refused <c>invalid_credentials</c>, the same for
/// both, and records a failure for the email. An unknown email is checked against a fixed hash, so
/// it takes as long as a wrong password, and it is paused like a known one.</item>
/// </list>
/// Each sign-in calls <see cref="ForgetFailuresAsync"/> when it succeeds by its own rules.
/// </summary>
internal sealed class MemberCredentials(IAppDbContext db, IPasswordHasherService hasher, TimeProvider time)
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
        var emailKey = SignInFailure.KeyOf(normalizedEmail);
        var now = time.GetUtcNow();
        var windowStart = SignInFailure.Attempts.Since(now);
        var recentFailures = await db.SignInFailures
            .CountAsync(f => f.EmailKey == emailKey && f.FailedAt > windowStart, cancellationToken)
            .ConfigureAwait(false);
        if (SignInFailure.Attempts.IsFull(recentFailures))
        {
            throw new RefusalException(RefusalCodes.TooManyAttempts, RefusalKind.TooManyRequests);
        }

        // The Christian Fitness account cannot sign in: it is checked as an unknown email (ADR 0065).
        var member = await db.Members
            .SingleOrDefaultAsync(m => m.NormalizedEmail == normalizedEmail && !m.IsSystem, cancellationToken)
            .ConfigureAwait(false);
        var verified = hasher.Verify(member?.PasswordHash ?? (_unknownMemberHash ??= hasher.Hash(Guid.NewGuid().ToString("N"))), password);
        if (member is null || !verified)
        {
            await RecordFailureAsync(normalizedEmail, now, windowStart, cancellationToken).ConfigureAwait(false);
            throw Refused();
        }

        return member;
    }

    /// <summary>Clears the failures counted against <paramref name="email"/>: its sign-in succeeded.</summary>
    public async Task ForgetFailuresAsync(string email, CancellationToken cancellationToken)
    {
        var emailKey = SignInFailure.KeyOf(Member.NormalizeEmail(email));
        db.SignInFailures.RemoveRange(await db.SignInFailures.Where(f => f.EmailKey == emailKey).ToListAsync(cancellationToken).ConfigureAwait(false));
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Records one failure, first forgetting every failure the window has left behind.</summary>
    private async Task RecordFailureAsync(string normalizedEmail, DateTimeOffset now, DateTimeOffset windowStart, CancellationToken cancellationToken)
    {
        db.SignInFailures.RemoveRange(await db.SignInFailures.Where(f => f.FailedAt <= windowStart).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.SignInFailures.Add(SignInFailure.Record(normalizedEmail, now));
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private static RefusalException Refused() =>
        new(RefusalCodes.InvalidCredentials, RefusalKind.Unauthenticated);
}
