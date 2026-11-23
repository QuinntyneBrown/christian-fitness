using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Account;

/// <summary>Finds the reset a link's token belongs to, with its member (ADR 0010: only the hash is stored).</summary>
internal static class PasswordResetLookup
{
    public static async Task<(PasswordReset Reset, Member Member)?> FindAsync(IAppDbContext db, string? token, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(token))
        {
            return null;
        }

        var hash = PasswordReset.HashOf(token);
        var reset = await db.PasswordResets
            .SingleOrDefaultAsync(r => r.TokenHash == hash, cancellationToken)
            .ConfigureAwait(false);
        if (reset is null)
        {
            return null;
        }

        var member = await db.Members
            .SingleOrDefaultAsync(m => m.Id == reset.MemberId, cancellationToken)
            .ConfigureAwait(false);
        return member is null ? null : (reset, member);
    }
}
