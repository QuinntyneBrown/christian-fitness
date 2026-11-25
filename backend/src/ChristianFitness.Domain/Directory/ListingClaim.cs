using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;

namespace ChristianFitness.Domain.Directory;

/// <summary>
/// A link to claim and publish an approved listing (L2-078 AC1; ADR 0090). Only the SHA-256 hash
/// of its token is stored; the token exists only in the email or message that carries the link.
/// </summary>
public sealed class ListingClaim
{
    /// <summary>How long a claim link works (L2-078 AC1).</summary>
    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(14);

    private const int TokenBytes = 32;

    private ListingClaim()
    {
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    /// <summary>The SHA-256 hash of the token, in lower-case hex.</summary>
    public string TokenHash { get; private set; } = string.Empty;

    public DateTimeOffset IssuedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    /// <summary>When the link was spent; none while unused (journey 19).</summary>
    public DateTimeOffset? UsedAt { get; private set; }

    /// <summary>A new claim of <paramref name="listingId"/> and its token: 32 random bytes in base64url.</summary>
    public static (ListingClaim Claim, string Token) Issue(Guid listingId, DateTimeOffset issuedAt)
    {
        var token = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(TokenBytes));
        var claim = new ListingClaim
        {
            Id = Guid.CreateVersion7(issuedAt),
            ListingId = listingId,
            TokenHash = HashOf(token),
            IssuedAt = issuedAt,
            ExpiresAt = issuedAt + Lifetime,
        };
        return (claim, token);
    }

    /// <summary>Uses the link once (L2-078 AC6, AC7; ADR 0091): a used link cannot be used again.</summary>
    public void Spend(DateTimeOffset at)
    {
        if (UsedAt is not null)
        {
            throw new InvalidOperationException("The claim link was already used.");
        }

        UsedAt = at;
    }

    /// <summary>The SHA-256 hash of <paramref name="token"/> in lower-case hex: how a claim is found.</summary>
    public static string HashOf(string token)
    {
        ArgumentNullException.ThrowIfNull(token);
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.ASCII.GetBytes(token)));
    }
}
