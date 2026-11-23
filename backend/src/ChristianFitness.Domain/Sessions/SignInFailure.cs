using System.Security.Cryptography;
using System.Text;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Domain.Sessions;

/// <summary>
/// One failed sign-in, counted against its email for 15 minutes (L2-004 AC3; ADR 0011). The email
/// is kept only as <see cref="EmailKey"/>, a SHA-256 of its lookup key, so an address a stranger
/// typed is not stored.
/// </summary>
public sealed class SignInFailure
{
    /// <summary>The length of SHA-256 in hex.</summary>
    public const int EmailKeyLength = 64;

    /// <summary>5 failures for the email within 15 minutes pause sign-in for it.</summary>
    public static readonly AttemptWindow Attempts = new(5, TimeSpan.FromMinutes(15));

    private SignInFailure()
    {
    }

    public Guid Id { get; private set; }

    public string EmailKey { get; private set; } = string.Empty;

    public DateTimeOffset FailedAt { get; private set; }

    /// <summary>A failure for the email whose lookup key is <paramref name="normalizedEmail"/>, made at <paramref name="failedAt"/>.</summary>
    public static SignInFailure Record(string normalizedEmail, DateTimeOffset failedAt) => new()
    {
        Id = Guid.CreateVersion7(failedAt),
        EmailKey = KeyOf(normalizedEmail),
        FailedAt = failedAt,
    };

    /// <summary>The key a failure is stored under: the SHA-256 of the email's lookup key, in lower-case hex.</summary>
    public static string KeyOf(string normalizedEmail)
    {
        ArgumentNullException.ThrowIfNull(normalizedEmail);
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(normalizedEmail)));
    }
}
