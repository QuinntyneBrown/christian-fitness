using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Sessions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Sessions;

/// <summary>
/// Signs a member in with their email and password (L2-004 AC1; ADR 0009, ADR 0012). In order:
/// <list type="number">
/// <item>with <see cref="SignInFailure.Attempts"/> full, 5 failures for the email in the last 15
/// minutes, the attempt is refused <c>too_many_attempts</c> before the password is checked, and not recorded
/// (L2-004 AC3);</item>
/// <item>the credentials are checked by <see cref="MemberCredentials"/>, which the admin sign-in
/// shares (ADR 0011): an unknown email, a wrong password or a blank field is refused
/// <c>invalid_credentials</c> whatever was wrong (L2-004 AC2), and records a failure for the email
/// unless a field was blank;</item>
/// <item>a suspended member with the right password is refused <c>account_suspended</c>, so the
/// suspension is told only to whoever knows the password (L2-004 AC4);</item>
/// <item>otherwise the email's failures are cleared and the member is signed in.</item>
/// </list>
/// </summary>
internal sealed class SignInHandler(IAppDbContext db, MemberCredentials credentials, ISessionSignIn session, TimeProvider time)
    : IRequestHandler<SignInCommand, SessionDto>
{
    public async Task<SessionDto> Handle(SignInCommand request, CancellationToken cancellationToken)
    {
        var blank = string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrEmpty(request.Password);
        var normalizedEmail = blank ? string.Empty : Member.NormalizeEmail(request.Email!);
        var emailKey = SignInFailure.KeyOf(normalizedEmail);
        var now = time.GetUtcNow();
        var windowStart = SignInFailure.Attempts.Since(now);
        if (!blank)
        {
            var recentFailures = await db.SignInFailures
                .CountAsync(f => f.EmailKey == emailKey && f.FailedAt > windowStart, cancellationToken)
                .ConfigureAwait(false);
            if (SignInFailure.Attempts.IsFull(recentFailures))
            {
                throw new RefusalException(RefusalCodes.TooManyAttempts, RefusalKind.TooManyRequests);
            }
        }

        Member member;
        try
        {
            member = await credentials.VerifyAsync(request.Email, request.Password, cancellationToken).ConfigureAwait(false);
        }
        catch (RefusalException) when (!blank)
        {
            await RecordFailureAsync(normalizedEmail, now, windowStart, cancellationToken).ConfigureAwait(false);
            throw;
        }

        if (member.Status == MemberStatus.Suspended)
        {
            throw new RefusalException(RefusalCodes.AccountSuspended, RefusalKind.Forbidden);
        }

        db.SignInFailures.RemoveRange(await db.SignInFailures.Where(f => f.EmailKey == emailKey).ToListAsync(cancellationToken).ConfigureAwait(false));
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await session.SignInAsync(member).ConfigureAwait(false);
        return new SessionDto(member.Id, member.Name);
    }

    /// <summary>Records one failure, first forgetting every failure the window has left behind.</summary>
    private async Task RecordFailureAsync(string normalizedEmail, DateTimeOffset now, DateTimeOffset windowStart, CancellationToken cancellationToken)
    {
        db.SignInFailures.RemoveRange(await db.SignInFailures.Where(f => f.FailedAt <= windowStart).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.SignInFailures.Add(SignInFailure.Record(normalizedEmail, now));
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
