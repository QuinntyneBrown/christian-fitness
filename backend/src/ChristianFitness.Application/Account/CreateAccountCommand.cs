using ChristianFitness.Application.Sessions;
using MediatR;

namespace ChristianFitness.Application.Account;

/// <summary>
/// A visitor's Join form (L2-003). A class, not a record: a record's generated <c>ToString</c>
/// would print the password and the home church if it were ever logged (L2-033 AC2).
/// </summary>
public sealed class CreateAccountCommand : IRequest<SessionDto>
{
    public string FullName { get; init; } = string.Empty;

    public string Email { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;

    /// <summary>Optional: blank or missing is stored as none (L2-003 AC4, L2-033 AC1).</summary>
    public string? HomeChurch { get; init; }

    public IReadOnlyList<string> Interests { get; init; } = [];
}
