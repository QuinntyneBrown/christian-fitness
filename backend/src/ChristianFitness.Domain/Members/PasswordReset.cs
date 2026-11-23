using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;

namespace ChristianFitness.Domain.Members;

/// <summary>
/// One reset link issued to a member (L2-044 AC2; ADR 0010). Only a hash of the link's token is
/// stored; the token itself exists only in the email.
/// </summary>
public sealed class PasswordReset
{
    /// <summary>How long a link works after it was requested.</summary>
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(30);

    /// <summary>At most 3 reset emails per account per hour (L2-044 AC6).</summary>
    public static readonly AttemptWindow RequestWindow = new(3, TimeSpan.FromHours(1));

    private const int TokenBytes = 32;

    private PasswordReset()
    {
    }

    public Guid Id { get; private set; }

    public Guid MemberId { get; private set; }

    /// <summary>The SHA-256 hash of the token, in lower-case hex.</summary>
    public string TokenHash { get; private set; } = string.Empty;

    public DateTimeOffset RequestedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    /// <summary>When the link set a password, or was spent by another that did; empty while unused (L2-045 AC2).</summary>
    public DateTimeOffset? UsedAt { get; private set; }

    /// <summary>Whether the link can still set a password at <paramref name="now"/>.</summary>
    public bool IsUsableAt(DateTimeOffset now) => UsedAt is null && now < ExpiresAt;

    /// <summary>Spends the link at <paramref name="now"/>: it never works again.</summary>
    public void Use(DateTimeOffset now) => UsedAt = now;

    /// <summary>
    /// A new reset for <paramref name="memberId"/> and its token: 32 random bytes in base64url, for
    /// the link only. The reset keeps the token's hash and expires <see cref="Lifetime"/> after
    /// <paramref name="requestedAt"/>.
    /// </summary>
    public static (PasswordReset Reset, string Token) Issue(Guid memberId, DateTimeOffset requestedAt)
    {
        var token = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(TokenBytes));
        var reset = new PasswordReset
        {
            Id = Guid.CreateVersion7(requestedAt),
            MemberId = memberId,
            TokenHash = HashOf(token),
            RequestedAt = requestedAt,
            ExpiresAt = requestedAt + Lifetime,
        };
        return (reset, token);
    }

    /// <summary>The SHA-256 hash of <paramref name="token"/> in lower-case hex: how a reset is found.</summary>
    public static string HashOf(string token)
    {
        ArgumentNullException.ThrowIfNull(token);
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.ASCII.GetBytes(token)));
    }
}
