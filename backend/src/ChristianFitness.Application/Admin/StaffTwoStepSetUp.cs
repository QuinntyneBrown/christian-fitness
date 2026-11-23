using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Admin;

/// <summary>
/// What <c>cf two-step &lt;email&gt;</c> does (L2-046 AC6; ADR 0013): gives the staff account with
/// <paramref name="email"/> a new random authenticator secret, replacing any earlier one (how a
/// lost phone is handled), and answers the <c>otpauth://</c> link an authenticator app reads, to be
/// shown once to the operator. An email that is not a staff account's gets nothing.
/// </summary>
public sealed class StaffTwoStepSetUp(IAppDbContext db, TimeProvider time)
{
    private const string Issuer = "Christian Fitness";

    public async Task<string?> SetUpAsync(string email, CancellationToken cancellationToken)
    {
        var normalizedEmail = Member.NormalizeEmail(email);
        var member = await db.Members.SingleOrDefaultAsync(m => m.NormalizedEmail == normalizedEmail, cancellationToken).ConfigureAwait(false);
        if (member is null || !await db.StaffRoles.AnyAsync(role => role.MemberId == member.Id, cancellationToken).ConfigureAwait(false))
        {
            return null;
        }

        var now = time.GetUtcNow();
        var twoStep = await db.StaffTwoSteps.SingleOrDefaultAsync(t => t.MemberId == member.Id, cancellationToken).ConfigureAwait(false);
        if (twoStep is null)
        {
            twoStep = StaffTwoStep.SetUp(member.Id, now);
            db.StaffTwoSteps.Add(twoStep);
        }
        else
        {
            twoStep.Renew(now);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        var label = Uri.EscapeDataString($"{Issuer}:{member.NormalizedEmail}").Replace("%3A", ":", StringComparison.Ordinal);
        return $"otpauth://totp/{label}?secret={Totp.Base32Of(twoStep.Secret)}&issuer={Uri.EscapeDataString(Issuer)}"
            + $"&algorithm=SHA1&digits={Totp.Digits}&period={(int)Totp.StepLength.TotalSeconds}";
    }
}
