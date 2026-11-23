namespace ChristianFitness.Domain.Members;

/// <summary>
/// A person's account. Staff are members with a <see cref="StaffRole"/>. The password is held only
/// as a hash (L2-030 AC1).
/// </summary>
public sealed class Member
{
    public const int NameMaxLength = 100;
    public const int EmailMaxLength = 254;
    public const int HomeChurchMaxLength = 120;

    private Member()
    {
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public string Email { get; private set; } = string.Empty;

    /// <summary>The email as a lookup key: trimmed and lower case, so one address is one account.</summary>
    public string NormalizedEmail { get; private set; } = string.Empty;

    public string PasswordHash { get; private set; } = string.Empty;

    /// <summary>The congregation the member attends: optional, sensitive and never logged (L2-033 AC1, AC2).</summary>
    public string? HomeChurch { get; private set; }

    /// <summary>The keys of the activities the member follows (<see cref="Members.Interests"/>).</summary>
    public IReadOnlyList<string> Interests { get; private set; } = [];

    public MemberStatus Status { get; private set; }

    public DateTimeOffset JoinedAt { get; private set; }

    /// <summary>
    /// A new, active member. A blank home church is stored as none (L2-003 AC4); the interests
    /// are kept once each, in the order given.
    /// </summary>
    public static Member Join(
        string name,
        string email,
        string passwordHash,
        DateTimeOffset joinedAt,
        string? homeChurch = null,
        IEnumerable<string>? interests = null)
    {
        ArgumentNullException.ThrowIfNull(name);
        ArgumentNullException.ThrowIfNull(email);
        return new Member
        {
            Id = Guid.CreateVersion7(joinedAt),
            Name = name.Trim(),
            Email = email.Trim(),
            NormalizedEmail = NormalizeEmail(email),
            PasswordHash = passwordHash,
            HomeChurch = string.IsNullOrWhiteSpace(homeChurch) ? null : homeChurch.Trim(),
            Interests = [.. (interests ?? []).Distinct(StringComparer.Ordinal)],
            Status = MemberStatus.Active,
            JoinedAt = joinedAt,
        };
    }

    /// <summary>Replaces the password with <paramref name="passwordHash"/>, a hash, never the password (L2-030 AC1, L2-045 AC2).</summary>
    public void ChangePassword(string passwordHash)
    {
        ArgumentException.ThrowIfNullOrEmpty(passwordHash);
        PasswordHash = passwordHash;
    }

    public static string NormalizeEmail(string email)
    {
        ArgumentNullException.ThrowIfNull(email);
#pragma warning disable CA1308 // A lookup key, not a comparison: email addresses are conventionally lower case.
        return email.Trim().ToLowerInvariant();
#pragma warning restore CA1308
    }
}
