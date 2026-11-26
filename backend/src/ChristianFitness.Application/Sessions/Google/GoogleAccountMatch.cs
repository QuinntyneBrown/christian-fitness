using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Sessions.Google;

/// <summary>
/// Finds the member account of a Google identity (L2-049 AC4): first the member whose stored
/// <see cref="Member.GoogleSubject"/> is the identity's subject; failing that, the member whose
/// email is the identity's (compared trimmed and in lower case) and who has no Google account yet,
/// which is then linked to the subject. The link is saved with whatever the caller saves next.
/// The member and staff finishes both use it.
/// </summary>
public sealed class GoogleAccountMatch(IAppDbContext db)
{
    public async Task<Member?> FindAsync(GoogleIdentity identity, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(identity);
        var bySubject = await db.Members
            .SingleOrDefaultAsync(member => member.GoogleSubject == identity.Subject, cancellationToken)
            .ConfigureAwait(false);
        if (bySubject is not null)
        {
            return bySubject;
        }

        var email = Member.NormalizeEmail(identity.Email);
        var byEmail = await db.Members
            .SingleOrDefaultAsync(member => member.NormalizedEmail == email, cancellationToken)
            .ConfigureAwait(false);
        // The email binds only an account with no Google account yet: one already bound to another
        // subject is not taken over by a second Google account with the same address (ADR 0099).
        if (byEmail is not { GoogleSubject: null })
        {
            return null;
        }

        byEmail.LinkGoogle(identity.Subject);
        return byEmail;
    }
}
