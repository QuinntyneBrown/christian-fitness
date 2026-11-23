using MediatR;

namespace ChristianFitness.Application.Account;

/// <summary>
/// Whether the link holding <see cref="Token"/> can still set a password (L2-045 AC1; ADR 0014). A
/// class, not a record: a record's generated <c>ToString</c> would print the token if it were ever
/// logged (L2-033 AC2).
/// </summary>
public sealed class CheckPasswordResetQuery : IRequest<PasswordResetCheckDto>
{
    public string Token { get; init; } = string.Empty;
}

/// <summary>The account a usable link belongs to, so the screen can name it (L2-045 AC1).</summary>
public sealed class PasswordResetCheckDto
{
    public required string Email { get; init; }
}
