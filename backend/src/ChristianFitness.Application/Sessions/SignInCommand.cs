using MediatR;

namespace ChristianFitness.Application.Sessions;

/// <summary>
/// A member's sign-in (L2-004). A class, not a record: a record's generated <c>ToString</c> would
/// print the password if it were ever logged (L2-033 AC2).
/// </summary>
public sealed class SignInCommand : IRequest<SessionDto>
{
    public string Email { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;
}
