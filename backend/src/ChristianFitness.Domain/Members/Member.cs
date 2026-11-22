namespace ChristianFitness.Domain.Members;

/// <summary>
/// A person's account. Staff are members with a <see cref="StaffRole"/>. The password is held only
/// as a hash (L2-030 AC1).
/// </summary>
public sealed class Member
{
    public const int NameMaxLength = 100;
    public const int EmailMaxLength = 254;

    private Member()
    {
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public string Email { get; private set; } = string.Empty;

    /// <summary>The email as a lookup key: trimmed and lower case, so one address is one account.</summary>
    public string NormalizedEmail { get; private set; } = string.Empty;

    public string PasswordHash { get; private set; } = string.Empty;

    public MemberStatus Status { get; private set; }

    public DateTimeOffset JoinedAt { get; private set; }

    public static Member Join(string name, string email, string passwordHash, DateTimeOffset joinedAt)
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
            Status = MemberStatus.Active,
            JoinedAt = joinedAt,
        };
    }

    public static string NormalizeEmail(string email)
    {
        ArgumentNullException.ThrowIfNull(email);
#pragma warning disable CA1308 // A lookup key, not a comparison: email addresses are conventionally lower case.
        return email.Trim().ToLowerInvariant();
#pragma warning restore CA1308
    }
}
