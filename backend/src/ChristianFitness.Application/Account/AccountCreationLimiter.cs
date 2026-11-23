namespace ChristianFitness.Application.Account;

/// <summary>
/// At most <see cref="Limit"/> accounts created from one client address in a sliding hour (L2-034
/// AC2; ADR 0012). The handler takes a lease before it creates the member and gives it back when
/// the join creates nothing, so only accounts created count.
/// </summary>
public sealed class AccountCreationLimiter(TimeProvider time) : AddressRateLimiter(time, Limit, Window)
{
    public const int Limit = 5;

    public static readonly TimeSpan Window = TimeSpan.FromHours(1);
}
