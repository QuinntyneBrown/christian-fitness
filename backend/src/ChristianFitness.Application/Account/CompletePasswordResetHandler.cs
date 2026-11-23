using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Account;

/// <summary>
/// Sets a new password through a usable link (L2-045 AC2; ADR 0012). The password is stored only as
/// its PBKDF2 hash (L2-030 AC1), the member's links are spent and every session of the member ends,
/// in one save (L2-045 AC3). Nobody is signed in: the member signs in with
/// the new password. An unknown, used or expired link is refused 410 <c>reset_link_expired</c> and
/// changes nothing (L2-045 AC4).
/// </summary>
internal sealed class CompletePasswordResetHandler(
    IAppDbContext db,
    IPasswordHasherService hasher,
    ISessionRevocation sessions,
    TimeProvider time)
    : IRequestHandler<CompletePasswordResetCommand>
{
    public async Task Handle(CompletePasswordResetCommand request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var found = await PasswordResetLookup.FindAsync(db, request.Token, cancellationToken).ConfigureAwait(false);
        if (found is not { } usable || !usable.Reset.IsUsableAt(now))
        {
            throw new RefusalException(RefusalCodes.ResetLinkExpired, RefusalKind.Gone);
        }

        usable.Member.ChangePassword(hasher.Hash(request.Password));

        // This link and every other unused one of the member: an older email cannot undo the change.
        var memberId = usable.Member.Id;
        var unused = await db.PasswordResets
            .Where(r => r.MemberId == memberId && r.UsedAt == null)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        foreach (var reset in unused.Append(usable.Reset).Distinct())
        {
            reset.Use(now);
        }

        // Signed out everywhere, in the same save as the new password (L2-045 AC3).
        await sessions.EndAllAsync(memberId, cancellationToken).ConfigureAwait(false);
        try
        {
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (DbUpdateConcurrencyException spent)
        {
            // Another save used the link between this one's read and its write (L2-045 AC7): the
            // transaction keeps nothing of this one.
            throw new RefusalException(RefusalCodes.ResetLinkExpired, RefusalKind.Gone, spent);
        }
    }
}
