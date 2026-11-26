using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Sessions.Google;
using ChristianFitness.Domain.Members;
using MediatR;

namespace ChristianFitness.Application.Sessions.Google
{
    /// <summary>The team's Google Workspace domain, which Staff sign in is limited to (L2-018; ADR 0100).</summary>
    public interface IGoogleStaffDomain
    {
        /// <summary>The domain, such as <c>christian.fitness</c>; none while it is not set.</summary>
        string? Domain { get; }
    }
}

namespace ChristianFitness.Application.Admin
{
    /// <summary>
    /// Finishes staff Google sign-in with the identity Google sent back to the admin app (L2-018
    /// AC1; ADR 0100). A staff change, audited as <c>staff_session.started</c> (L2-019 AC3).
    /// </summary>
    public sealed class CompleteStaffGoogleSignInCommand : IRequest<StaffSessionDto>, IAuditableCommand
    {
        string IAuditableCommand.AuditAction => "staff_session.started";
    }

    /// <summary>
    /// In order (ADR 0100), every refusal forgetting the identity and starting no session:
    /// <list type="number">
    /// <item>no identity kept by the staff scheme, or an unverified email: <c>google_email_unverified</c>, 401;</item>
    /// <item>an account whose Workspace domain (Google's signed <c>hd</c>) is not the team's:
    /// <c>wrong_domain</c>, 403, naming the <c>account</c>;</item>
    /// <item>no member account, or one with no staff role: <c>not_staff</c>, 403, naming the
    /// <c>account</c>; nothing is bound;</item>
    /// <item>a suspended member: <c>account_suspended</c>, 403;</item>
    /// <item>otherwise the account is bound to the Google subject (<see cref="GoogleAccountMatch"/>)
    /// and the staff session starts with a new key.</item>
    /// </list>
    /// </summary>
    internal sealed class CompleteStaffGoogleSignInHandler(
        IGoogleIdentityReader identities,
        IGoogleStaffDomain staffDomain,
        GoogleAccountMatch match,
        IAppDbContext db,
        IStaffSessionSignIn session,
        AuditTrail audit) : IRequestHandler<CompleteStaffGoogleSignInCommand, StaffSessionDto>
    {
        public async Task<StaffSessionDto> Handle(CompleteStaffGoogleSignInCommand request, CancellationToken cancellationToken)
        {
            var identity = await identities.ReadAsync(GoogleApp.Staff).ConfigureAwait(false)
                ?? throw new RefusalException(RefusalCodes.GoogleEmailUnverified, RefusalKind.Unauthenticated);
            await identities.ForgetAsync().ConfigureAwait(false);
            if (!identity.EmailVerified)
            {
                throw new RefusalException(RefusalCodes.GoogleEmailUnverified, RefusalKind.Unauthenticated);
            }

            var domain = staffDomain.Domain;
            if (domain is null || !string.Equals(identity.HostedDomain, domain, StringComparison.OrdinalIgnoreCase))
            {
                throw Naming(RefusalCodes.WrongDomain, identity);
            }

            var member = await match.FindAsync(identity, cancellationToken).ConfigureAwait(false);
            var role = member is null ? null : await StaffRoles.OfAsync(db, member.Id, cancellationToken).ConfigureAwait(false);
            if (member is null || role is null)
            {
                throw Naming(RefusalCodes.NotStaff, identity);
            }

            if (member.Status == MemberStatus.Suspended)
            {
                throw new RefusalException(RefusalCodes.AccountSuspended, RefusalKind.Forbidden);
            }

            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            await session.SignInAsync(member, role.Value).ConfigureAwait(false);
            audit.Record(member.Id, StaffSessionDto.RecordType, member.Id);
            return new StaffSessionDto(member.Id, member.Name, role.Value.ToString());
        }

        /// <summary>A 403 naming the Google account, for the sign-in notice to show as text.</summary>
        private static RefusalException Naming(string code, GoogleIdentity identity) =>
            new(code, RefusalKind.Forbidden) { Extensions = new Dictionary<string, object?> { ["account"] = identity.Email } };
    }
}
