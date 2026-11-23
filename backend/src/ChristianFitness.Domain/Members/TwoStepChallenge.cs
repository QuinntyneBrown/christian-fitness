using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;

namespace ChristianFitness.Domain.Members;

/// <summary>
/// A pending admin sign-in (L2-046 AC1, AC5; ADR 0013): the password was right, the code is still
/// to come. Only a hash of its token is stored; the token itself lives in the step cookie.
/// </summary>
public sealed class TwoStepChallenge
{
    /// <summary>How long staff have to enter their code after the password step.</summary>
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(5);

    /// <summary>At most 5 wrong codes per account in 15 minutes (L2-046 AC4), as for passwords (L2-004 AC3).</summary>
    public static readonly AttemptWindow FailureWindow = new(5, TimeSpan.FromMinutes(15));

    private const int TokenBytes = 32;

    private TwoStepChallenge()
    {
    }

    public Guid Id { get; private set; }

    public Guid MemberId { get; private set; }

    /// <summary>The SHA-256 hash of the token, in lower-case hex.</summary>
    public string TokenHash { get; private set; } = string.Empty;

    public DateTimeOffset IssuedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    /// <summary>
    /// A new challenge for <paramref name="memberId"/> and its token, 32 random bytes in base64url for
    /// the step cookie only. It expires <see cref="Lifetime"/> after <paramref name="issuedAt"/>.
    /// </summary>
    public static (TwoStepChallenge Challenge, string Token) Issue(Guid memberId, DateTimeOffset issuedAt)
    {
        var token = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(TokenBytes));
        var challenge = new TwoStepChallenge
        {
            Id = Guid.CreateVersion7(issuedAt),
            MemberId = memberId,
            TokenHash = HashOf(token),
            IssuedAt = issuedAt,
            ExpiresAt = issuedAt + Lifetime,
        };
        return (challenge, token);
    }

    /// <summary>The SHA-256 hash of <paramref name="token"/> in lower-case hex: how a challenge is found.</summary>
    public static string HashOf(string token)
    {
        ArgumentNullException.ThrowIfNull(token);
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.ASCII.GetBytes(token)));
    }

    /// <summary>Whether the code may still be entered at <paramref name="now"/>.</summary>
    public bool IsOpenAt(DateTimeOffset now) => now < ExpiresAt;
}
