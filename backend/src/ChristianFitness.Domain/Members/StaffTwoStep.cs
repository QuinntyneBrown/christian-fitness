using System.Security.Cryptography;

namespace ChristianFitness.Domain.Members;

/// <summary>
/// A staff account's authenticator (L2-046; ADR 0013): the TOTP secret its app shares with the
/// server, and the last step whose code opened a session, so no code opens two. The secret is
/// never answered by the API or logged.
/// </summary>
public sealed class StaffTwoStep
{
    private StaffTwoStep()
    {
    }

    public Guid MemberId { get; private set; }

    /// <summary>The shared secret, <see cref="Totp.SecretBytes"/> bytes.</summary>
    public byte[] Secret { get; private set; } = [];

    /// <summary>The step of the last code that opened a session; 0 before the first.</summary>
    public long LastUsedStep { get; private set; }

    public DateTimeOffset SetUpAt { get; private set; }

    /// <summary>Two-step verification for <paramref name="memberId"/> with a new random secret.</summary>
    public static StaffTwoStep SetUp(Guid memberId, DateTimeOffset at) =>
        SetUp(memberId, RandomNumberGenerator.GetBytes(Totp.SecretBytes), at);

    /// <summary>Two-step verification for <paramref name="memberId"/> with <paramref name="secret"/>.</summary>
    public static StaffTwoStep SetUp(Guid memberId, ReadOnlySpan<byte> secret, DateTimeOffset at)
    {
        if (secret.IsEmpty)
        {
            throw new ArgumentException("A secret has at least one byte.", nameof(secret));
        }

        return new StaffTwoStep { MemberId = memberId, Secret = secret.ToArray(), SetUpAt = at };
    }

    /// <summary>
    /// A new random secret, as when a phone is lost: the old app's codes stop working and any step
    /// may be used again with the new one.
    /// </summary>
    public void Renew(DateTimeOffset at)
    {
        Secret = RandomNumberGenerator.GetBytes(Totp.SecretBytes);
        LastUsedStep = 0;
        SetUpAt = at;
    }

    /// <summary>
    /// Whether <paramref name="code"/> is a fresh code at <paramref name="now"/> (<see cref="Totp.Match"/>);
    /// when it is, its step is recorded so it cannot be used again.
    /// </summary>
    public bool TryUse(string? code, DateTimeOffset now)
    {
        if (Totp.Match(Secret, code, now, LastUsedStep) is not { } step)
        {
            return false;
        }

        LastUsedStep = step;
        return true;
    }
}
