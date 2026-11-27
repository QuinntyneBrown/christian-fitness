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
    public const int CityMaxLength = 100;
    public const int BioMaxLength = 300;
    public const int GoalsMaxCount = 5;
    public const int GoalMaxLength = 80;
    public const int ModerationNoteMaxLength = 500;

    /// <summary>Google's subject identifier is at most 255 ASCII characters (OpenID Connect Core 2).</summary>
    public const int GoogleSubjectMaxLength = 255;

    private Member()
    {
    }

    public DateOnly? AcceptedTermsVersion { get; private set; }

    public DateOnly? AcceptedPrivacyVersion { get; private set; }

    public DateTimeOffset? AcceptedLegalAt { get; private set; }

    public void AcceptLegal(DateOnly terms, DateOnly privacy, DateTimeOffset now)
    {
        AcceptedTermsVersion = terms;
        AcceptedPrivacyVersion = privacy;
        AcceptedLegalAt = now;
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public string Email { get; private set; } = string.Empty;

    /// <summary>The email as a lookup key: trimmed and lower case, so one address is one account.</summary>
    public string NormalizedEmail { get; private set; } = string.Empty;

    public string PasswordHash { get; private set; } = string.Empty;

    /// <summary>
    /// The Google account this member signs in with: Google's subject, which never changes, unlike
    /// the account's email (L2-049 AC4). None until the member first signs in with Google.
    /// </summary>
    public string? GoogleSubject { get; private set; }

    /// <summary>
    /// The key of the member's photo in the image store: the Google photo, copied once when they
    /// joined with Google (L2-049 AC14). None otherwise.
    /// </summary>
    public string? PhotoKey { get; private set; }

    /// <summary>The congregation the member attends: optional, sensitive and never logged (L2-033 AC1, AC2).</summary>
    public string? HomeChurch { get; private set; }

    /// <summary>The keys of the activities the member follows (<see cref="Members.Interests"/>).</summary>
    public IReadOnlyList<string> Interests { get; private set; } = [];

    /// <summary>Where the member lives, as they write it; none until they give one (L2-005 AC1; slice 18.2 edits it).</summary>
    public string? City { get; private set; }

    /// <summary>A short introduction, at most 300 characters; none until written (L2-006 AC3).</summary>
    public string? Bio { get; private set; }

    /// <summary>What the member is working toward this year: at most 5, of at most 80 characters (L2-006 AC3).</summary>
    public IReadOnlyList<string> Goals { get; private set; } = [];

    /// <summary>
    /// Whether other members may see the home church: false until the member shows it (L2-006 AC4).
    /// Only the public profile (slice 19.1) reads it; the member always sees their own.
    /// </summary>
    public bool ShowHomeChurch { get; private set; }

    public MemberStatus Status { get; private set; }

    /// <summary>
    /// Why staff last flagged or suspended the member (L2-029 AC1, AC2; ADR 0028): staff's own words,
    /// at most 500 characters, shown on the member's row and never logged. None until then.
    /// </summary>
    public string? ModerationNote { get; private set; }

    public DateTimeOffset JoinedAt { get; private set; }

    /// <summary>
    /// An account the system owns, not a person (ADR 0065): it has no password, cannot sign in, is in
    /// no member list and takes no replies.
    /// </summary>
    public bool IsSystem { get; private set; }

    /// <summary>The Christian Fitness account (<see cref="SystemMembers"/>), with no password hash.</summary>
    public static Member ChristianFitness(DateTimeOffset createdAt) => new()
    {
        Id = SystemMembers.ChristianFitnessId,
        Name = SystemMembers.ChristianFitnessName,
        Email = SystemMembers.ChristianFitnessEmail,
        NormalizedEmail = NormalizeEmail(SystemMembers.ChristianFitnessEmail),
        PasswordHash = string.Empty,
        Status = MemberStatus.Active,
        JoinedAt = createdAt,
        IsSystem = true,
    };

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

    /// <summary>
    /// Replaces what the member says about themselves (L2-006 AC2; ADR 0024). Each value is trimmed;
    /// a blank city, home church or bio is stored as none, blank goals are dropped and each interest
    /// is kept once, in the order given. The limits are the validator's, checked before this.
    /// </summary>
    public void EditProfile(
        string name,
        string? city,
        string? homeChurch,
        bool showHomeChurch,
        string? bio,
        IEnumerable<string> goals,
        IEnumerable<string> interests)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentNullException.ThrowIfNull(goals);
        ArgumentNullException.ThrowIfNull(interests);
        Name = name.Trim();
        City = NoneIfBlank(city);
        HomeChurch = NoneIfBlank(homeChurch);
        ShowHomeChurch = showHomeChurch;
        Bio = NoneIfBlank(bio);
        Goals = [.. goals.Where(goal => !string.IsNullOrWhiteSpace(goal)).Select(goal => goal.Trim())];
        Interests = [.. interests.Distinct(StringComparer.Ordinal)];
    }

    /// <summary>
    /// Sets from Preferences what the profile also holds (L2-065 AC7, AC10): the interests, each kept
    /// once in the order given, and whether the home church is shown.
    /// </summary>
    public void ChangeFromPreferences(IEnumerable<string>? interests, bool? showHomeChurch)
    {
        if (interests is not null)
        {
            Interests = [.. interests.Distinct(StringComparer.Ordinal)];
        }

        if (showHomeChurch is { } show)
        {
            ShowHomeChurch = show;
        }
    }

    /// <summary>
    /// Flags an Active member with <paramref name="note"/> (L2-029 AC1). Answers false, changing
    /// nothing, for a member already Flagged or Suspended.
    /// </summary>
    public bool TryFlag(string note) => TryModerate(MemberStatus.Flagged, Status == MemberStatus.Active, note);

    /// <summary>
    /// Suspends an Active or Flagged member with <paramref name="note"/> (L2-029 AC2). Answers false,
    /// changing nothing, for a member already Suspended.
    /// </summary>
    public bool TrySuspend(string note) => TryModerate(MemberStatus.Suspended, Status != MemberStatus.Suspended, note);

    /// <summary>
    /// Returns a Flagged or Suspended member to Active and clears the note, which gave the reason
    /// for a standing they no longer have (L2-029 AC3; ADR 0029). Answers false, changing nothing,
    /// for a member already Active.
    /// </summary>
    public bool TryReinstate()
    {
        if (Status == MemberStatus.Active)
        {
            return false;
        }

        Status = MemberStatus.Active;
        ModerationNote = null;
        return true;
    }

    private bool TryModerate(MemberStatus to, bool allowed, string note)
    {
        ArgumentNullException.ThrowIfNull(note);
        if (!allowed)
        {
            return false;
        }

        Status = to;
        ModerationNote = note.Trim();
        return true;
    }

    /// <summary>Replaces the password with <paramref name="passwordHash"/>, a hash, never the password (L2-030 AC1, L2-045 AC2).</summary>
    public void ChangePassword(string passwordHash)
    {
        ArgumentException.ThrowIfNullOrEmpty(passwordHash);
        PasswordHash = passwordHash;
    }

    /// <summary>
    /// A new, active member who joined with Google (L2-003 AC9): the Google account's email, the
    /// name they gave, no password (a password sign-in answers as a wrong password), linked to
    /// <paramref name="googleSubject"/>, with the copied Google photo's key when there is one.
    /// </summary>
    public static Member JoinWithGoogle(
        string name,
        string email,
        string googleSubject,
        DateTimeOffset joinedAt,
        string? homeChurch = null,
        IEnumerable<string>? interests = null,
        string? photoKey = null)
    {
        var member = Join(name, email, string.Empty, joinedAt, homeChurch, interests);
        member.LinkGoogle(googleSubject);
        member.PhotoKey = photoKey;
        return member;
    }

    /// <summary>
    /// Links the Google account <paramref name="subject"/> names, found by this member's email; the
    /// password, if any, is kept (L2-049 AC4).
    /// </summary>
    public void LinkGoogle(string subject)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(subject);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(subject.Length, GoogleSubjectMaxLength, nameof(subject));
        GoogleSubject = subject;
    }

    private static string? NoneIfBlank(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    public static string NormalizeEmail(string email)
    {
        ArgumentNullException.ThrowIfNull(email);
#pragma warning disable CA1308 // A lookup key, not a comparison: email addresses are conventionally lower case.
        return email.Trim().ToLowerInvariant();
#pragma warning restore CA1308
    }
}
