namespace ChristianFitness.Domain.Directory;

/// <summary>
/// A member's proposal that a person or group be listed in the directory, stored for staff to
/// check (L2-062; L2-073; ADR 0086). It is created <see cref="SuggestionStatus.Waiting"/>. Every
/// text is plain text, never rendered as HTML, and is never logged: the name, the reason, the
/// church connection (a faith detail) and the contact email are personal data (L2-033).
/// </summary>
public sealed class ListingSuggestion
{
    public const int NameMaxLength = DirectoryListing.NameMaxLength;
    public const int WhereMaxLength = DirectoryListing.AreaMaxLength;
    public const int WebsiteMaxLength = DirectoryListing.WebsiteMaxLength;
    public const int ChurchConnectionMaxLength = 200;
    public const int ReasonMaxLength = 1000;
    public const int ContactEmailMaxLength = 254;

    /// <summary>At most 5 suggestions from one member in a rolling 24 hours (L2-062 AC8; ADR 0077).</summary>
    public static readonly Members.AttemptWindow DailyWindow = new(5, TimeSpan.FromDays(1));

    private ListingSuggestion()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The member who sent it.</summary>
    public Guid SuggestedById { get; private set; }

    public SuggestionRelation Relation { get; private set; }

    public ListingKind Kind { get; private set; }

    public string Name { get; private set; } = string.Empty;

    /// <summary>Where they meet or work.</summary>
    public string Where { get; private set; } = string.Empty;

    /// <summary>An https address (<see cref="TryReadWebsite"/>), or none.</summary>
    public string? Website { get; private set; }

    /// <summary>An optional faith detail; never required and never logged (L2-033 AC1).</summary>
    public string? ChurchConnection { get; private set; }

    public string? Reason { get; private set; }

    /// <summary>Used only to contact the suggested party about the listing (L2-062 AC10); none for Myself.</summary>
    public string? ContactEmail { get; private set; }

    /// <summary>Whether staff may tell the suggested party who suggested them; always false for Myself.</summary>
    public bool MayTellWhoSuggested { get; private set; }

    public DateTimeOffset SubmittedAt { get; private set; }

    public SuggestionStatus Status { get; private set; }

    /// <summary>When staff approved or declined it; none while it waits (L2-073 AC9).</summary>
    public DateTimeOffset? DecidedAt { get; private set; }

    /// <summary>The staff member who decided it.</summary>
    public Guid? DecidedById { get; private set; }

    /// <summary>Staff's optional reason for declining, kept for staff only and never sent (L2-073 AC8).</summary>
    public string? DeclineReason { get; private set; }

    /// <summary>The draft listing approval made from it.</summary>
    public Guid? ListingId { get; private set; }

    /// <summary>The longest decline reason staff may keep (ADR 0087).</summary>
    public const int DeclineReasonMaxLength = 500;

    /// <summary>A decided suggestion stays in the console's list this long after its decision (ADR 0077).</summary>
    public static readonly TimeSpan ListedAfterDecision = TimeSpan.FromDays(90);

    /// <summary>A decided suggestion is purged this long after its decision (ADR 0078).</summary>
    public static readonly TimeSpan KeptAfterDecision = TimeSpan.FromDays(365);

    /// <summary>
    /// A Waiting suggestion sent by <paramref name="suggestedById"/> at <paramref name="submittedAt"/>
    /// (ADR 0086). Texts are trimmed and a blank optional one is none; the website is read by
    /// <see cref="TryReadWebsite"/> and must already be valid. For Myself the contact email and the
    /// permission are dropped.
    /// </summary>
    public static ListingSuggestion Submit(
        Guid suggestedById,
        SuggestionRelation relation,
        ListingKind kind,
        string name,
        string where,
        string? website,
        string? churchConnection,
        string? reason,
        string? contactEmail,
        bool mayTellWhoSuggested,
        DateTimeOffset submittedAt)
    {
        ArgumentNullException.ThrowIfNull(name);
        ArgumentNullException.ThrowIfNull(where);
        if (!TryReadWebsite(website, out var read))
        {
            throw new ArgumentException("The website is not an https web address.", nameof(website));
        }

        var self = relation == SuggestionRelation.Myself;
        return new ListingSuggestion
        {
            Id = Guid.CreateVersion7(submittedAt),
            SuggestedById = suggestedById,
            Relation = relation,
            Kind = kind,
            Name = name.Trim(),
            Where = where.Trim(),
            Website = read,
            ChurchConnection = Optional(churchConnection),
            Reason = Optional(reason),
            ContactEmail = self ? null : Optional(contactEmail),
            MayTellWhoSuggested = !self && mayTellWhoSuggested,
            SubmittedAt = submittedAt,
            Status = SuggestionStatus.Waiting,
        };
    }

    /// <summary>
    /// Reads a website as ADR 0086 does: blank is none (<c>null</c>); a value without <c>://</c> gets
    /// <c>https://</c> in front; the result must be an absolute https address whose host has a dot,
    /// with no user name or password, at most <see cref="WebsiteMaxLength"/> characters. False when
    /// it is not one.
    /// </summary>
    public static bool TryReadWebsite(string? text, out string? website)
    {
        website = null;
        if (string.IsNullOrWhiteSpace(text))
        {
            return true;
        }

        var candidate = Candidate(text);
        if (candidate.Length > WebsiteMaxLength
            || !Uri.TryCreate(candidate, UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || !uri.Host.Contains('.', StringComparison.Ordinal)
            || uri.UserInfo.Length > 0
            || candidate.Any(char.IsWhiteSpace))
        {
            return false;
        }

        website = candidate;
        return true;
    }

    /// <summary>Whether a website that reads as one is over <see cref="WebsiteMaxLength"/> once read.</summary>
    public static bool IsWebsiteTooLong(string? text) =>
        !string.IsNullOrWhiteSpace(text) && Candidate(text).Length > WebsiteMaxLength;

    /// <summary>The website as read: trimmed, with <c>https://</c> in front when it names no scheme.</summary>
    private static string Candidate(string text)
    {
        var trimmed = text.Trim();
        return trimmed.Contains("://", StringComparison.Ordinal) ? trimmed : "https://" + trimmed;
    }

    private static string? Optional(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();
}
