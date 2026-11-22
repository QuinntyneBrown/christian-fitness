using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Account;

/// <summary>
/// Creates the member, with the password stored only as a PBKDF2 hash (L2-030 AC1), and signs them
/// in, so the visitor lands on Home with a session (L2-003 AC1). An email already registered,
/// compared by its lookup key, is refused with <c>email_taken</c> and creates nothing (L2-003 AC2);
/// the body was validated before this runs (<see cref="CreateAccountValidator"/>).
/// </summary>
internal sealed class CreateAccountHandler(IAppDbContext db, IPasswordHasherService hasher, ISessionSignIn session, TimeProvider time)
    : IRequestHandler<CreateAccountCommand, SessionDto>
{
    public async Task<SessionDto> Handle(CreateAccountCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = Member.NormalizeEmail(request.Email);
        if (await IsTakenAsync(normalizedEmail, cancellationToken).ConfigureAwait(false))
        {
            throw new RefusalException(RefusalCodes.EmailTaken, RefusalKind.Conflict);
        }

        var member = Member.Join(
            request.FullName,
            request.Email,
            hasher.Hash(request.Password),
            time.GetUtcNow(),
            request.HomeChurch,
            request.Interests);
        db.Members.Add(member);
        try
        {
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (DbUpdateException exception)
        {
            // Two joins with one email at the same moment both pass the lookup; the unique index
            // refuses the second, which gets the same answer as if it had come later.
            db.Members.Remove(member);
            if (await IsTakenAsync(normalizedEmail, cancellationToken).ConfigureAwait(false))
            {
                throw new RefusalException(RefusalCodes.EmailTaken, RefusalKind.Conflict, exception);
            }

            throw;
        }

        await session.SignInAsync(member).ConfigureAwait(false);
        return new SessionDto(member.Id, member.Name);
    }

    private Task<bool> IsTakenAsync(string normalizedEmail, CancellationToken cancellationToken) =>
        db.Members.AnyAsync(m => m.NormalizedEmail == normalizedEmail, cancellationToken);
}
