using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using MediatR;

namespace ChristianFitness.Application.Sessions.Google;

/// <summary>Finishes a member's Google sign-in with the identity Google returned (L2-004 AC8; ADR 0099).</summary>
public sealed class CompleteGoogleSignInCommand : IRequest<SessionDto>;

/// <summary>
/// In order (docs/detailed-designs/member-access/sign-in-with-google):
/// <list type="number">
/// <item>no identity (none came back, or it is older than 10 minutes) is refused
/// <c>google_email_unverified</c>, 401;</item>
/// <item>an unverified email is forgotten and refused the same way: nothing is created, linked or
/// signed in (L2-049 AC3);</item>
/// <item><see cref="GoogleAccountMatch"/> finds the member account, linking one found by email
/// (L2-049 AC4);</item>
/// <item>none found is refused <c>no_account</c>, 404, with the <c>account</c> the screen names,
/// and the identity is kept for "Create my profile" (L2-004 AC9);</item>
/// <item>a suspended member is refused <c>account_suspended</c>, 403, and the identity forgotten
/// (L2-004 AC10);</item>
/// <item>otherwise the identity is forgotten, the link saved and the member signed in.</item>
/// </list>
/// </summary>
internal sealed class CompleteGoogleSignInHandler(
    IGoogleIdentityReader identities,
    GoogleAccountMatch match,
    IAppDbContext db,
    ISessionSignIn session) : IRequestHandler<CompleteGoogleSignInCommand, SessionDto>
{
    public async Task<SessionDto> Handle(CompleteGoogleSignInCommand request, CancellationToken cancellationToken)
    {
        var identity = await identities.ReadAsync(GoogleApp.Member).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.GoogleEmailUnverified, RefusalKind.Unauthenticated);
        if (!identity.EmailVerified)
        {
            await identities.ForgetAsync().ConfigureAwait(false);
            throw new RefusalException(RefusalCodes.GoogleEmailUnverified, RefusalKind.Unauthenticated);
        }

        var member = await match.FindAsync(identity, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NoAccount, RefusalKind.NotFound)
            {
                Extensions = new Dictionary<string, object?> { ["account"] = identity.Email },
            };
        await identities.ForgetAsync().ConfigureAwait(false);
        if (member.Status == MemberStatus.Suspended)
        {
            throw new RefusalException(RefusalCodes.AccountSuspended, RefusalKind.Forbidden);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await session.SignInAsync(member).ConfigureAwait(false);
        return new SessionDto(member.Id, member.Name);
    }
}
