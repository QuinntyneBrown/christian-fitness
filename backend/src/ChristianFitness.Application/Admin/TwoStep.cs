using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Admin;

/// <summary>
/// The second step of staff sign-in: the code from the authenticator app (L2-046 AC2). A class, not
/// a record, so the code can never reach a log through a generated <c>ToString</c> (L2-046 AC8).
/// Starting a staff session is a staff change, audited as <c>staff_session.started</c> (L2-019 AC3;
/// ADR 0021).
/// </summary>
public sealed class VerifyTwoStepCommand : IRequest<StaffSessionDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "staff_session.started";

    public string? Code { get; init; }
}

/// <summary>
/// Checks a second-step code against the pending sign-in its step cookie names (ADR 0013), refusing
/// in this order: no cookie or an unknown or expired challenge with <c>two_step_expired</c> (L2-046
/// AC5); a full failure window with <c>too_many_attempts</c>, right code or not, ending the
/// challenge (AC4); a wrong, malformed or used code with <c>invalid_code</c>, recording one failure
/// (AC3). A right code ends the challenge and its cookie and starts the staff session (AC2), which
/// the audit trail records as the staff member's own change to their session (ADR 0021).
/// </summary>
internal sealed class VerifyTwoStepHandler(IAppDbContext db, ITwoStepCookie cookie, IStaffSessionSignIn session, AuditTrail audit, TimeProvider time)
    : IRequestHandler<VerifyTwoStepCommand, StaffSessionDto>
{
    public async Task<StaffSessionDto> Handle(VerifyTwoStepCommand request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var challenge = await ChallengeAsync(cancellationToken).ConfigureAwait(false);
        if (challenge is null || !challenge.IsOpenAt(now))
        {
            await EndAsync(challenge, cancellationToken).ConfigureAwait(false);
            throw new RefusalException(RefusalCodes.TwoStepExpired, RefusalKind.Unauthenticated);
        }

        var memberId = challenge.MemberId;
        var window = TwoStepChallenge.FailureWindow;
        var since = window.Since(now);
        var failures = await db.TwoStepFailures
            .CountAsync(failure => failure.MemberId == memberId && failure.FailedAt > since, cancellationToken)
            .ConfigureAwait(false);
        if (window.IsFull(failures))
        {
            await EndAsync(challenge, cancellationToken).ConfigureAwait(false);
            throw new RefusalException(RefusalCodes.TooManyAttempts, RefusalKind.TooManyRequests);
        }

        var twoStep = await db.StaffTwoSteps.SingleOrDefaultAsync(t => t.MemberId == memberId, cancellationToken).ConfigureAwait(false);
        var role = await StaffRoles.OfAsync(db, memberId, cancellationToken).ConfigureAwait(false);
        if (role is null || twoStep is null)
        {
            // The role or the authenticator was taken away since the password step.
            await EndAsync(challenge, cancellationToken).ConfigureAwait(false);
            throw role is null ? StaffRoles.NotStaff() : new RefusalException(RefusalCodes.TwoStepNotSetUp, RefusalKind.Forbidden);
        }

        if (!twoStep.TryUse(request.Code, now))
        {
            db.TwoStepFailures.Add(TwoStepFailure.Record(memberId, now));
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            throw new RefusalException(RefusalCodes.InvalidCode, RefusalKind.Unauthenticated);
        }

        var member = await db.Members.SingleAsync(m => m.Id == memberId, cancellationToken).ConfigureAwait(false);
        await EndAsync(challenge, cancellationToken).ConfigureAwait(false);
        await session.SignInAsync(member, role.Value).ConfigureAwait(false);
        audit.Record(member.Id, StaffSessionDto.RecordType, member.Id);
        return new StaffSessionDto(member.Id, member.Name, role.Value.ToString());
    }

    private async Task<TwoStepChallenge?> ChallengeAsync(CancellationToken cancellationToken)
    {
        if (cookie.Read() is not { } token)
        {
            return null;
        }

        var hash = TwoStepChallenge.HashOf(token);
        return await db.TwoStepChallenges.SingleOrDefaultAsync(c => c.TokenHash == hash, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Ends the pending sign-in, saving whatever else changed, and expires its cookie.</summary>
    private async Task EndAsync(TwoStepChallenge? challenge, CancellationToken cancellationToken)
    {
        if (challenge is not null)
        {
            db.TwoStepChallenges.Remove(challenge);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        cookie.Clear();
    }
}
