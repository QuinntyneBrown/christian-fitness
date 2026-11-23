using MediatR;

namespace ChristianFitness.Application.Account;

/// <summary>
/// A new password set through the link holding <see cref="Token"/> (L2-045 AC2; ADR 0014). A class,
/// not a record: a record's generated <c>ToString</c> would print the token and the password if it
/// were ever logged (L2-033 AC2).
/// </summary>
public sealed class CompletePasswordResetCommand : IRequest
{
    public string Token { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;
}
