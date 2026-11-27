using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Application.Sessions.Google;
using ChristianFitness.Domain.Members;
using MediatR;

namespace ChristianFitness.Application.Account;

/// <summary>What a sign-in to a deleting account is told (L2-066 AC8; ADR 0118).</summary>
internal static class AccountDeleting
{
    /// <summary>
    /// 409 <c>account_deleting</c>, naming the account and when it is erased, for the Sign in screen
    /// to offer Restore. Only whoever proved the credentials is told, as for a suspension.
    /// </summary>
    public static RefusalException Refusal(Member member) => new(RefusalCodes.AccountDeleting, RefusalKind.Conflict)
    {
        Extensions = new Dictionary<string, object?> { ["account"] = member.Email, ["erasesAt"] = member.ErasesAt },
    };

    /// <summary>Restores <paramref name="member"/> when deleting and audits it; otherwise there is nothing to audit.</summary>
    public static void Restore(Member member, AuditTrail audit)
    {
        if (!member.IsDeleting)
        {
            audit.Unchanged();
            return;
        }

        member.RestoreFromDeletion();
        audit.Record(member.Id, nameof(Member), member.Id);
    }
}

/// <summary>
/// "Restore my account" after a password sign-in (L2-066 AC8; ADR 0118): the same email and password
/// are checked again as a sign-in checks them, then the deletion is cleared and the member signed
/// in, audited with the member as actor. Places that went back are not restored. A class, not a
/// record, so the password is never printed (L2-033 AC2).
/// </summary>
public sealed class RestoreAccountCommand : IRequest<SessionDto>, IAuditableCommand
{
    public string Email { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;

    public string AuditAction => "account.restored";
}

internal sealed class RestoreAccountHandler(IAppDbContext db, MemberCredentials credentials, ISessionSignIn session, AuditTrail audit)
    : IRequestHandler<RestoreAccountCommand, SessionDto>
{
    public async Task<SessionDto> Handle(RestoreAccountCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var member = await credentials.VerifyAsync(request.Email, request.Password, cancellationToken).ConfigureAwait(false);
        if (member.Status == MemberStatus.Suspended)
        {
            throw new RefusalException(RefusalCodes.AccountSuspended, RefusalKind.Forbidden);
        }

        AccountDeleting.Restore(member, audit);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await credentials.ForgetFailuresAsync(request.Email, cancellationToken).ConfigureAwait(false);
        await session.SignInAsync(member).ConfigureAwait(false);
        return new SessionDto(member.Id, member.Name);
    }
}

/// <summary>
/// "Restore my account" after a Google sign-in (L2-066 AC8; ADR 0118): the Google identity the
/// sign-in kept proves the account again, as finishing a Google sign-in does; the deletion is
/// cleared, the identity forgotten and the member signed in, audited with the member as actor.
/// </summary>
public sealed record RestoreGoogleAccountCommand : IRequest<SessionDto>, IAuditableCommand
{
    public string AuditAction => "account.restored";
}

internal sealed class RestoreGoogleAccountHandler(
    IGoogleIdentityReader identities,
    GoogleAccountMatch match,
    IAppDbContext db,
    ISessionSignIn session,
    AuditTrail audit) : IRequestHandler<RestoreGoogleAccountCommand, SessionDto>
{
    public async Task<SessionDto> Handle(RestoreGoogleAccountCommand request, CancellationToken cancellationToken)
    {
        var identity = await identities.ReadAsync(GoogleApp.Member).ConfigureAwait(false);
        if (identity is not { EmailVerified: true })
        {
            await identities.ForgetAsync().ConfigureAwait(false);
            throw new RefusalException(RefusalCodes.GoogleEmailUnverified, RefusalKind.Unauthenticated);
        }

        var member = await match.FindAsync(identity, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NoAccount, RefusalKind.NotFound);
        await identities.ForgetAsync().ConfigureAwait(false);
        if (member.Status == MemberStatus.Suspended)
        {
            throw new RefusalException(RefusalCodes.AccountSuspended, RefusalKind.Forbidden);
        }

        AccountDeleting.Restore(member, audit);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await session.SignInAsync(member).ConfigureAwait(false);
        return new SessionDto(member.Id, member.Name);
    }
}
