using MediatR;

namespace ChristianFitness.Application.Account;

/// <summary>
/// A request for a reset link to <see cref="Email"/> (L2-044). A class, not a record: a record's
/// generated <c>ToString</c> would print the email if it were ever logged (L2-033 AC2).
/// </summary>
public sealed class RequestPasswordResetCommand : IRequest
{
    public string Email { get; init; } = string.Empty;
}
