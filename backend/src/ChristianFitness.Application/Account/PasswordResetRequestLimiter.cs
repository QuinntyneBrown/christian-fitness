namespace ChristianFitness.Application.Account;

/// <summary>
/// At most <see cref="Limit"/> password reset requests from one client address in a sliding hour,
/// whatever emails they name (L2-034 AC3; ADR 0014). Every request counts, for an account or not,
/// and none is given back, so a refusal depends only on the address and reveals no account.
/// </summary>
public sealed class PasswordResetRequestLimiter(TimeProvider time) : AddressRateLimiter(time, Limit, Window)
{
    public const int Limit = 10;

    public static readonly TimeSpan Window = TimeSpan.FromHours(1);
}
