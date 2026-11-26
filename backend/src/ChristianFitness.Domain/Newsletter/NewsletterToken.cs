using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;

namespace ChristianFitness.Domain.Newsletter;

/// <summary>
/// The newsletter's link tokens (ADR 0110): 32 random bytes in base64url, of which only the SHA-256
/// hash is stored, as a reset link's (ADR 0010).
/// </summary>
public static class NewsletterToken
{
    private const int TokenBytes = 32;

    /// <summary>A new token, for one link only.</summary>
    public static string Create() => Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(TokenBytes));

    /// <summary>The SHA-256 hash of <paramref name="token"/> in lower-case hex: how a link finds what it names.</summary>
    public static string HashOf(string token)
    {
        ArgumentNullException.ThrowIfNull(token);
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.ASCII.GetBytes(token)));
    }
}
