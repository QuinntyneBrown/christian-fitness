namespace ChristianFitness.Domain.Members;

/// <summary>
/// One press of "Delete my account" by a member (L2-066 AC11; ADR 0078, ADR 0118): who and when,
/// whatever the outcome, so an invalid or refused attempt counts against <see cref="Window"/> too.
/// Attempts older than the window are forgotten by the next attempt; all of a member's go with them.
/// </summary>
public sealed class AccountDeletionAttempt
{
    /// <summary>Five attempts per member in a rolling hour; the sixth is refused (AC11).</summary>
    public static readonly AttemptWindow Window = new(5, TimeSpan.FromHours(1));

    /// <summary>The word the member types to confirm (AC5).</summary>
    public const string ConfirmationWord = "delete";

    /// <summary>Whether <paramref name="typed"/> is the word, ignoring case and the spaces around it (AC5).</summary>
    public static bool Confirms(string? typed) =>
        string.Equals(typed?.Trim(), ConfirmationWord, StringComparison.OrdinalIgnoreCase);

    private AccountDeletionAttempt()
    {
    }

    public Guid Id { get; private set; }

    public Guid MemberId { get; private set; }

    public DateTimeOffset AttemptedAt { get; private set; }

    public static AccountDeletionAttempt Of(Guid memberId, DateTimeOffset now) =>
        new() { Id = Guid.CreateVersion7(now), MemberId = memberId, AttemptedAt = now };
}
