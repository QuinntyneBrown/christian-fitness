using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Seeding;

/// <summary>
/// The first Admin (L2-049 AC15; ADR 0100): a member with the Admin role, keyed by its normalised
/// email, with no password and no Google subject; its first Google sign-in binds it. An existing
/// account is left as it is.
/// </summary>
public sealed class StaffAccountSeed(StaffSeedOptions options, TimeProvider time) : ISeed
{
    public string Key => "first Admin";

    public Task<bool> ExistsAsync(IAppDbContext db, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);
        var email = Member.NormalizeEmail(options.Email);
        return db.Members.AnyAsync(member => member.NormalizedEmail == email, cancellationToken);
    }

    public void Apply(IAppDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
        // No password hash: a password sign-in is refused as a wrong password (MemberCredentials).
        var member = Member.Join(options.DisplayName, options.Email, string.Empty, time.GetUtcNow());
        db.Members.Add(member);
        db.StaffRoles.Add(StaffRole.Grant(member, StaffRoleName.Admin));
    }
}
