using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Domain.Members;
using MediatR;

namespace ChristianFitness.Application.Account;

/// <summary>
/// Creates the member, with the password stored only as a PBKDF2 hash (L2-030 AC1), and signs them
/// in, so the visitor lands on Home with a session (L2-003 AC1). The refusals are slice 2.2's.
/// </summary>
internal sealed class CreateAccountHandler(IAppDbContext db, IPasswordHasherService hasher, ISessionSignIn session, TimeProvider time)
    : IRequestHandler<CreateAccountCommand, SessionDto>
{
    public async Task<SessionDto> Handle(CreateAccountCommand request, CancellationToken cancellationToken)
    {
        var member = Member.Join(
            request.FullName,
            request.Email,
            hasher.Hash(request.Password),
            time.GetUtcNow(),
            request.HomeChurch,
            request.Interests);
        db.Members.Add(member);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await session.SignInAsync(member).ConfigureAwait(false);
        return new SessionDto(member.Id, member.Name);
    }
}
