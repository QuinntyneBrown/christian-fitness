namespace ChristianFitness.Application.Abstractions;

/// <summary>
/// The cookie that names a pending admin sign-in between the password and the code (L2-046;
/// ADR 0013). It holds the challenge's token, which nothing logs.
/// </summary>
public interface ITwoStepCookie
{
    /// <summary>Sets the cookie to <paramref name="token"/>, expiring at <paramref name="expiresAt"/>.</summary>
    void Issue(string token, DateTimeOffset expiresAt);

    /// <summary>The token the request carries, or null.</summary>
    string? Read();

    /// <summary>Expires the cookie.</summary>
    void Clear();
}
