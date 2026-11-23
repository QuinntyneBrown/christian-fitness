using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using MediatR;

namespace ChristianFitness.Application.Account;

/// <summary>
/// Answers the email of the account a usable link belongs to (L2-045 AC1); an unknown, used or
/// expired link is refused 410 <c>reset_link_expired</c>, alike in every case (L2-045 AC4; ADR 0013).
/// </summary>
internal sealed class CheckPasswordResetHandler(IAppDbContext db, TimeProvider time)
    : IRequestHandler<CheckPasswordResetQuery, PasswordResetCheckDto>
{
    public async Task<PasswordResetCheckDto> Handle(CheckPasswordResetQuery request, CancellationToken cancellationToken)
    {
        var found = await PasswordResetLookup.FindAsync(db, request.Token, cancellationToken).ConfigureAwait(false);
        if (found is not { } usable || !usable.Reset.IsUsableAt(time.GetUtcNow()))
        {
            throw new RefusalException(RefusalCodes.ResetLinkExpired, RefusalKind.Gone);
        }

        return new PasswordResetCheckDto { Email = usable.Member.Email };
    }
}
