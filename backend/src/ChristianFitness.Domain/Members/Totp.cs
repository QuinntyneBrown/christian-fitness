using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;

namespace ChristianFitness.Domain.Members;

/// <summary>
/// The authenticator code of RFC 6238 (L2-046; ADR 0012): HMAC-SHA1 over the number of 30-second
/// steps since the Unix epoch, truncated to 6 digits as RFC 4226 says, which every authenticator
/// app computes from an <c>otpauth://</c> link.
/// </summary>
public static class Totp
{
    /// <summary>How many digits a code has.</summary>
    public const int Digits = 6;

    /// <summary>How many bytes a new secret has: 160 bits, the size RFC 4226 recommends.</summary>
    public const int SecretBytes = 20;

    /// <summary>How many steps either side of now are accepted, for a phone's clock that drifts.</summary>
    public const int Drift = 1;

    /// <summary>How long one code lasts.</summary>
    public static readonly TimeSpan StepLength = TimeSpan.FromSeconds(30);

    private const string Base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    /// <summary>The step <paramref name="at"/> falls in.</summary>
    public static long StepAt(DateTimeOffset at) => at.ToUnixTimeSeconds() / (long)StepLength.TotalSeconds;

    /// <summary>The 6-digit code of <paramref name="step"/> for <paramref name="secret"/>.</summary>
    public static string CodeAt(ReadOnlySpan<byte> secret, long step)
    {
        Span<byte> counter = stackalloc byte[sizeof(long)];
        BinaryPrimitives.WriteInt64BigEndian(counter, step);
        Span<byte> hash = stackalloc byte[HMACSHA1.HashSizeInBytes];
#pragma warning disable CA5350 // RFC 6238's default and what authenticator apps compute; HMAC-SHA1 is not broken as a MAC.
        HMACSHA1.HashData(secret, counter, hash);
#pragma warning restore CA5350
        var offset = hash[^1] & 0x0F;
        var binary = BinaryPrimitives.ReadInt32BigEndian(hash[offset..]) & 0x7FFFFFFF;
        return (binary % 1_000_000).ToString("D6", System.Globalization.CultureInfo.InvariantCulture);
    }

    /// <summary>
    /// The step whose code <paramref name="code"/> is, among now's and <see cref="Drift"/> either side,
    /// as long as it is later than <paramref name="lastUsedStep"/>, so no code opens two sessions.
    /// Spaces are ignored; anything but 6 ASCII digits matches nothing. Null when nothing matches.
    /// </summary>
    public static long? Match(ReadOnlySpan<byte> secret, string? code, DateTimeOffset now, long lastUsedStep)
    {
        var typed = (code ?? string.Empty).Replace(" ", string.Empty, StringComparison.Ordinal);
        if (typed.Length != Digits || !typed.All(char.IsAsciiDigit))
        {
            return null;
        }

        var expected = Encoding.ASCII.GetBytes(typed);
        long? matched = null;
        var current = StepAt(now);
        // Every candidate is compared, in fixed time, so the answer's timing says nothing.
        for (var step = current - Drift; step <= current + Drift; step++)
        {
            var candidate = Encoding.ASCII.GetBytes(CodeAt(secret, step));
            if (CryptographicOperations.FixedTimeEquals(candidate, expected) && step > lastUsedStep)
            {
                matched ??= step;
            }
        }

        return matched;
    }

    /// <summary><paramref name="bytes"/> in RFC 4648 base32 without padding, as an <c>otpauth://</c> link carries a secret.</summary>
    public static string Base32Of(ReadOnlySpan<byte> bytes)
    {
        var text = new StringBuilder((bytes.Length * 8 + 4) / 5);
        var buffer = 0;
        var bits = 0;
        foreach (var b in bytes)
        {
            buffer = (buffer << 8) | b;
            bits += 8;
            while (bits >= 5)
            {
                text.Append(Base32Alphabet[(buffer >> (bits - 5)) & 0x1F]);
                bits -= 5;
            }
        }

        if (bits > 0)
        {
            text.Append(Base32Alphabet[(buffer << (5 - bits)) & 0x1F]);
        }

        return text.ToString();
    }
}
