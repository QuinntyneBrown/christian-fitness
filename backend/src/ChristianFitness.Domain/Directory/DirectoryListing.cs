namespace ChristianFitness.Domain.Directory;

/// <summary>
/// One organization, person, instructor, ambassador, company or church ministry behind the
/// community's events (L1-017; L2-054; ADR 0061, ADR 0082). Staff check it before it is
/// <see cref="ListingStatus.Published"/>; only then is it in the directory. It is not a Services
/// listing: the two are separate records linked through the owning member.
/// </summary>
public sealed class DirectoryListing
{
    public const int NameMaxLength = 120;
    public const int TaglineMaxLength = 160;
    public const int AreaMaxLength = 120;
    public const int DescriptionMaxLength = 2000;
    public const int WebsiteMaxLength = 200;
    public const int FocusTagMaxLength = 40;
    public const int PhotoKeyMaxLength = 64;
    public const int ContactEmailMaxLength = 254;

    /// <summary>The longest folded <see cref="SearchText"/>: every searched field and a separator between each.</summary>
    public const int SearchTextMaxLength = 1000;

    /// <summary>
    /// The stable id of the Listed Christian Fitness team listing, which the seed and the migration
    /// both use and every event defaults to as its host (ADR 0067, ADR 0082).
    /// </summary>
    public static readonly Guid TeamListingId = new("0193a9c0-0000-7000-8000-00000000cf01");

    private DirectoryListing()
    {
    }

    public Guid Id { get; private set; }

    public ListingKind Kind { get; private set; }

    /// <summary>
    /// The kind's place in the directory's order, stored beside the kind's name so the database
    /// sorts and pages by it (ADR 0082). Reordering <see cref="ListingKind"/> needs a migration that
    /// rewrites it.
    /// </summary>
    public int KindOrder { get; private set; }

    public string Name { get; private set; } = string.Empty;

    /// <summary>One line under the name, such as "Beginner-friendly running club".</summary>
    public string Tagline { get; private set; } = string.Empty;

    /// <summary>Where it is, such as "Etobicoke" or "Toronto-wide".</summary>
    public string Area { get; private set; } = string.Empty;

    public string Description { get; private set; } = string.Empty;

    /// <summary>What it is about, such as "Running" or "Youth"; searched with the rest.</summary>
    public IReadOnlyList<string> Focus { get; private set; } = [];

    /// <summary>Its website, an https address, or none.</summary>
    public string? WebsiteUrl { get; private set; }

    /// <summary>The stored photo's key, or none: the mark then shows initials.</summary>
    public string? PhotoKey { get; private set; }

    /// <summary>Staff confirmed who it is; shown as the Verified mark.</summary>
    public bool IsVerified { get; private set; }

    public ListingStatus Status { get; private set; }

    /// <summary>When it was made, or when staff listed it once published.</summary>
    public DateTimeOffset ListedAt { get; private set; }

    /// <summary>The member account that owns it, once claimed (ADR 0061).</summary>
    public Guid? MemberId { get; private set; }

    /// <summary>The suggestion it came from, when one did.</summary>
    public Guid? SuggestionId { get; private set; }

    /// <summary>The Services listing staff linked it to, when they did (ADR 0061).</summary>
    public Guid? ServiceListingId { get; private set; }

    /// <summary>
    /// Where members who message it may write (L2-079 AC7; ADR 0095), or none. Answered only to the
    /// owner, to staff and to a member who messages it; never traced or logged.
    /// </summary>
    public string? ContactEmail { get; private set; }

    /// <summary>A new name the owner asked for, waiting for staff (L2-079 AC5; ADR 0095), or none.</summary>
    public string? PendingName { get; private set; }

    /// <summary>A new kind waiting for staff with <see cref="PendingName"/>, or none.</summary>
    public ListingKind? PendingKind { get; private set; }

    /// <summary>When the waiting change was last asked for, or none.</summary>
    public DateTimeOffset? PendingSince { get; private set; }

    /// <summary>The name folded by <see cref="SearchFold"/>: the directory's name order (ADR 0082).</summary>
    public string NameKey { get; private set; } = string.Empty;

    /// <summary>Name, tagline, area and focus tags folded by <see cref="SearchFold"/>, one per line: what a search matches (ADR 0082).</summary>
    public string SearchText { get; private set; } = string.Empty;

    /// <summary>A new draft with the given fields, trimmed; the caller has checked every limit.</summary>
    public static DirectoryListing CreateDraft(
        Guid id,
        ListingKind kind,
        string name,
        string tagline,
        string area,
        IEnumerable<string> focus,
        DateTimeOffset createdAt,
        string description = "",
        string? websiteUrl = null,
        bool isVerified = false)
    {
        var listing = new DirectoryListing
        {
            Id = id,
            Status = ListingStatus.Draft,
            ListedAt = createdAt,
            IsVerified = isVerified,
        };
        listing.Describe(kind, name, tagline, area, focus, description, websiteUrl);
        return listing;
    }

    /// <summary>Replaces what describes it and rebuilds the search keys; the caller has checked every limit.</summary>
    public void Describe(ListingKind kind, string name, string tagline, string area, IEnumerable<string> focus, string description, string? websiteUrl)
    {
        ArgumentNullException.ThrowIfNull(name);
        ArgumentNullException.ThrowIfNull(tagline);
        ArgumentNullException.ThrowIfNull(area);
        ArgumentNullException.ThrowIfNull(focus);
        ArgumentNullException.ThrowIfNull(description);
        Kind = kind;
        KindOrder = (int)kind;
        Name = name.Trim();
        Tagline = tagline.Trim();
        Area = area.Trim();
        Focus = [.. focus.Select(tag => tag.Trim()).Where(tag => tag.Length > 0)];
        Description = description.Trim();
        WebsiteUrl = string.IsNullOrWhiteSpace(websiteUrl) ? null : websiteUrl.Trim();
        NameKey = SearchFold.Of(Name);
        SearchText = SearchFold.Of(string.Join('\n', [Name, Tagline, Area, .. Focus]));
    }

    /// <summary>
    /// The owner's changes that go live at once (L2-079 AC4; ADR 0095): about, website, focus tags
    /// and contact email, trimmed, with the search keys rebuilt. The caller has checked every limit.
    /// </summary>
    public void EditByOwner(string description, string? websiteUrl, IEnumerable<string> focus, string? contactEmail)
    {
        Describe(Kind, Name, Tagline, Area, focus, description, websiteUrl);
        SetContact(contactEmail);
    }

    /// <summary>
    /// The owner's name and kind (L2-079 AC2, AC5; ADR 0095): one that differs from the live one waits
    /// for staff from <paramref name="at"/> while the live one stays; the same change asked again
    /// keeps when it was first asked; the live one withdraws any waiting change. The name is trimmed;
    /// the caller has checked its limit.
    /// </summary>
    public void AskToRename(string name, ListingKind kind, DateTimeOffset at)
    {
        ArgumentNullException.ThrowIfNull(name);
        var trimmed = name.Trim();
        if (string.Equals(trimmed, Name, StringComparison.Ordinal) && kind == Kind)
        {
            ClearRename();
            return;
        }

        if (string.Equals(trimmed, PendingName, StringComparison.Ordinal) && kind == PendingKind)
        {
            return;
        }

        PendingName = trimmed;
        PendingKind = kind;
        PendingSince = at;
    }

    /// <summary>Staff approve the waiting name and kind: they go live, with the search keys rebuilt.</summary>
    public void ApproveRename()
    {
        if (PendingName is null || PendingKind is not { } kind)
        {
            throw new InvalidOperationException("No name change is waiting.");
        }

        Describe(kind, PendingName, Tagline, Area, Focus, Description, WebsiteUrl);
        ClearRename();
    }

    /// <summary>Staff decline the waiting name and kind, or staff set them directly: nothing waits.</summary>
    public void DeclineRename() => ClearRename();

    private void ClearRename()
    {
        PendingName = null;
        PendingKind = null;
        PendingSince = null;
    }

    /// <summary>Sets the contact email, or clears it with none.</summary>
    public void SetContact(string? contactEmail) =>
        ContactEmail = string.IsNullOrWhiteSpace(contactEmail) ? null : contactEmail.Trim();

    /// <summary>Staff checked it: it is in the directory from <paramref name="at"/>.</summary>
    public void Publish(DateTimeOffset at)
    {
        if (Status == ListingStatus.Published)
        {
            throw new InvalidOperationException("The listing is already published.");
        }

        Status = ListingStatus.Published;
        ListedAt = at;
    }

    /// <summary>
    /// The listed party said yes through the claim link (L2-078 AC6; ADR 0092): the draft is in the
    /// directory from <paramref name="at"/>, owned by <paramref name="memberId"/>.
    /// </summary>
    public void Claim(Guid memberId, DateTimeOffset at)
    {
        if (Status != ListingStatus.Draft)
        {
            throw new InvalidOperationException("Only a draft listing can be claimed.");
        }

        Status = ListingStatus.Published;
        MemberId = memberId;
        ListedAt = at;
    }

    /// <summary>Its owner's account was erased (ADR 0118): the listing stays in the directory, owned by nobody.</summary>
    public void ReleaseOwner() => MemberId = null;

    /// <summary>Staff declined a listing still waiting for their check, or the listed party said it isn't them (ADR 0092).</summary>
    public void Decline()
    {
        if (Status != ListingStatus.Draft)
        {
            throw new InvalidOperationException("Only a draft listing can be declined.");
        }

        Status = ListingStatus.Declined;
    }

    /// <summary>Staff took a published listing out of the directory.</summary>
    public void Remove()
    {
        if (Status != ListingStatus.Published)
        {
            throw new InvalidOperationException("Only a published listing can be removed.");
        }

        Status = ListingStatus.Removed;
    }

    /// <summary>The suggestion it was made from (ADR 0090).</summary>
    public void MadeFrom(Guid suggestionId) => SuggestionId = suggestionId;

    /// <summary>Sets the stored photo, or clears it with none.</summary>
    public void ShowPhoto(string? photoKey) => PhotoKey = string.IsNullOrWhiteSpace(photoKey) ? null : photoKey;
}
