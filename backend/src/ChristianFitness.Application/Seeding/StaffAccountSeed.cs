using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Seeding;

/// <summary>
/// The first staff account: a member with the Admin role, keyed by its normalised email. An
/// existing account is left as it is, password included.
/// </summary>
public sealed class StaffAccountSeed(StaffSeedOptions options, IPasswordHasherService hasher, TimeProvider time) : ISeed
{
    public string Key => "first staff account";

    public Task<bool> ExistsAsync(IAppDbContext db, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);
        var email = Member.NormalizeEmail(options.Email);
        return db.Members.AnyAsync(member => member.NormalizedEmail == email, cancellationToken);
    }

    public void Apply(IAppDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
        var member = Member.Join(options.Name, options.Email, hasher.Hash(options.Password), time.GetUtcNow());
        db.Members.Add(member);
        db.StaffRoles.Add(StaffRole.Grant(member, StaffRoleName.Admin));
    }
}
