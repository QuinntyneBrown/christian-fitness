namespace ChristianFitness.Domain.News;

/// <summary>Where a story is on its way to readers (L2-068).</summary>
public enum StoryStatus
{
    Draft,
    InReview,

    /// <summary>Waiting for its time (journey 23); nothing in journey 22 schedules a story (ADR 0097).</summary>
    Scheduled,
    Published,
}

/// <summary>The front page's six sections a story sits in (L2-001 AC1, L2-069 AC1).</summary>
public enum StorySection
{
    Events,
    Training,
    Nutrition,
    FaithAndBody,
    Community,
    Pros,
}

/// <summary>Where a published story sits on the front page (L2-069 AC1, AC6).</summary>
public enum StoryPlacement
{
    Lead,
    Top,
    Latest,
}

/// <summary>What a story points readers to (L2-069 AC1): nothing, a published event or a published listing.</summary>
public enum StoryPointer
{
    None,
    Event,
    Listing,
}

/// <summary>The part of the lead image readers see: a 16:9 rectangle of the original, in its pixels (L2-069 AC9; ADR 0097).</summary>
public sealed record StoryCrop(int X, int Y, int Width, int Height);

/// <summary>Everything the editor writes, applied at once by <see cref="Story.Edit"/> (L2-069 AC1).</summary>
public sealed record StoryContent(
    string Headline,
    string Summary,
    string Text,
    StorySection? Section,
    Guid? BylineId,
    StoryPlacement Placement,
    bool IncludeInWeekly,
    StoryPointer PointsTo,
    Guid? PointsToId,
    string? NextStepText,
    string? NextStepLink,
    string? Slug,
    string? ImageKey,
    StoryCrop? ImageCrop);

/// <summary>
/// A story Admins write, review and publish under a byline (L1-022, L2-068, L2-069; ADR 0094, ADR
/// 0097). Its methods are the only way its status changes; a change the status does not allow
/// throws <see cref="InvalidOperationException"/>, which the handler refuses as
/// <c>status_conflict</c>. <see cref="Version"/> grows with every change, so a save over a version
/// the editor has not seen is refused (<c>story_changed</c>). <see cref="ActivityAt"/> orders
/// Stories, newest first.
/// </summary>
public sealed class Story
{
    public const int HeadlineMaxLength = 160;
    public const int SummaryMaxLength = 300;
    public const int TextMaxLength = 50_000;
    public const int NextStepTextMaxLength = 80;
    public const int NextStepLinkMaxLength = 500;
    public const int SlugMaxLength = 80;

    private List<string> _formerSlugs = [];

    private Story()
    {
    }

    public Guid Id { get; private set; }

    public StoryStatus Status { get; private set; }

    /// <summary>The byline the story runs under; none until chosen, and a byline a story holds is never removed (L2-077 AC7).</summary>
    public Guid? BylineId { get; private set; }

    public string Headline { get; private set; } = string.Empty;

    public string Summary { get; private set; } = string.Empty;

    /// <summary>The story text in the small Markdown subset (L2-069 AC10), stored as written.</summary>
    public string Text { get; private set; } = string.Empty;

    public StorySection? Section { get; private set; }

    public StoryPlacement Placement { get; private set; } = StoryPlacement.Latest;

    public bool IncludeInWeekly { get; private set; }

    public StoryPointer PointsTo { get; private set; }

    public Guid? PointsToId { get; private set; }

    public string? NextStepText { get; private set; }

    /// <summary>An internal route (<c>/events/…</c>) or an <c>https</c> address, or none.</summary>
    public string? NextStepLink { get; private set; }

    /// <summary>The story's address under <c>/stories/</c>; none until set, or made from the headline when it is published.</summary>
    public string? Slug { get; private set; }

    /// <summary>The addresses the story had when published before its link changed; they keep working (L2-061 AC8).</summary>
    public IReadOnlyList<string> FormerSlugs
    {
        get => _formerSlugs;
        private set => _formerSlugs = [.. value];
    }

    public string? ImageKey { get; private set; }

    public StoryCrop? ImageCrop { get; private set; }

    /// <summary>Grows by one with every change; the concurrency token.</summary>
    public int Version { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset EditedAt { get; private set; }

    public DateTimeOffset? SubmittedAt { get; private set; }

    /// <summary>When it went out this time; none unless Published.</summary>
    public DateTimeOffset? PublishedAt { get; private set; }

    /// <summary>When it first went out; kept after Unpublish, so its reads stay counted (L2-068 AC1).</summary>
    public DateTimeOffset? FirstPublishedAt { get; private set; }

    /// <summary>When a Scheduled story goes out (journey 23).</summary>
    public DateTimeOffset? PublishAt { get; private set; }

    /// <summary>The latest edit, submission, schedule or publication; Stories is ordered by it (L2-068 AC1).</summary>
    public DateTimeOffset ActivityAt { get; private set; }

    /// <summary>A new Draft holding <paramref name="content"/>.</summary>
    public static Story Create(StoryContent content, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(content);
        var story = new Story { Id = Guid.CreateVersion7(now), Status = StoryStatus.Draft, CreatedAt = now };
        story.Apply(content, now);
        story.Version = 1;
        return story;
    }

    /// <summary>A new Draft under <paramref name="bylineId"/> with only a headline, as the bylines' tests make one.</summary>
    public static Story Create(Guid bylineId, string headline, DateTimeOffset createdAt) =>
        Create(Blank with { BylineId = bylineId, Headline = headline }, createdAt);

    /// <summary>What a new story holds before anything is written.</summary>
    public static StoryContent Blank { get; } = new(string.Empty, string.Empty, string.Empty, null, null, StoryPlacement.Latest, false, StoryPointer.None, null, null, null, null, null, null);

    /// <summary>What the story holds now, as the editor would send it back.</summary>
    public StoryContent Content => new(Headline, Summary, Text, Section, BylineId, Placement, IncludeInWeekly, PointsTo, PointsToId, NextStepText, NextStepLink, Slug, ImageKey, ImageCrop);

    /// <summary>
    /// Saves what the editor wrote (L2-069 AC11). A Draft or In review story saves as it is typed; a
    /// Published one only through Update (<see cref="UpdatePublished"/>). A link changed after the
    /// story was first published keeps the earlier one working (L2-069 AC8).
    /// </summary>
    public void Edit(StoryContent content, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(content);
        Require(StoryStatus.Draft, StoryStatus.InReview);
        Apply(content, now);
        Version++;
    }

    /// <summary>Update on a Published story: the changes are live at once (L2-069 AC5).</summary>
    public void UpdatePublished(StoryContent content, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(content);
        Require(StoryStatus.Published);
        Apply(content, now);
        Version++;
    }

    /// <summary>Send for review: a Draft becomes In review (L2-069 AC2).</summary>
    public void SendForReview(DateTimeOffset now)
    {
        Require(StoryStatus.Draft);
        Status = StoryStatus.InReview;
        SubmittedAt = now;
        Touch(now);
    }

    /// <summary>Back to draft: In review becomes a Draft, telling no one (L2-069 AC3).</summary>
    public void ReturnToDraft(DateTimeOffset now)
    {
        Require(StoryStatus.InReview);
        Status = StoryStatus.Draft;
        SubmittedAt = null;
        Touch(now);
    }

    /// <summary>Publish now, or Approve &amp; publish: a Draft or In review story goes out (L2-069 AC2, AC3).</summary>
    public void Publish(DateTimeOffset now)
    {
        Require(StoryStatus.Draft, StoryStatus.InReview);
        Status = StoryStatus.Published;
        PublishedAt = now;
        FirstPublishedAt ??= now;
        SubmittedAt = null;
        Touch(now);
    }

    /// <summary>Unpublish: the story becomes a Draft and leaves readers at once (L2-069 AC5).</summary>
    public void Unpublish(DateTimeOffset now)
    {
        Require(StoryStatus.Published);
        Status = StoryStatus.Draft;
        PublishedAt = null;
        Touch(now);
    }

    /// <summary>Another story became the Lead: this one stays out, an ordinary story at its own publish time (L2-069 AC6).</summary>
    public void GiveUpLead()
    {
        if (Placement == StoryPlacement.Lead)
        {
            Placement = StoryPlacement.Latest;
            Version++;
        }
    }

    /// <summary>Sets the link the story is published under, made from its headline when none was given (L2-069 AC8).</summary>
    public void SetSlug(string slug)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(slug);
        Slug = slug;
    }

    private void Apply(StoryContent content, DateTimeOffset now)
    {
        var slug = string.IsNullOrWhiteSpace(content.Slug) ? null : content.Slug.Trim();
        if (FirstPublishedAt is not null && Slug is not null && slug is not null && slug != Slug && !_formerSlugs.Contains(Slug))
        {
            _formerSlugs = [.. _formerSlugs, Slug];
        }

        if (slug is not null && _formerSlugs.Contains(slug))
        {
            _formerSlugs = [.. _formerSlugs.Where(s => s != slug)];
        }

        Headline = content.Headline.Trim();
        Summary = content.Summary.Trim();
        Text = content.Text.TrimEnd();
        Section = content.Section;
        BylineId = content.BylineId;
        Placement = content.Placement;
        IncludeInWeekly = content.IncludeInWeekly;
        PointsTo = content.PointsToId is null ? StoryPointer.None : content.PointsTo;
        PointsToId = PointsTo == StoryPointer.None ? null : content.PointsToId;
        NextStepText = string.IsNullOrWhiteSpace(content.NextStepText) ? null : content.NextStepText.Trim();
        NextStepLink = string.IsNullOrWhiteSpace(content.NextStepLink) ? null : content.NextStepLink.Trim();
        Slug = slug ?? (FirstPublishedAt is null ? null : Slug);
        ImageKey = content.ImageKey;
        ImageCrop = content.ImageKey is null ? null : content.ImageCrop;
        EditedAt = now;
        ActivityAt = now;
    }

    private void Touch(DateTimeOffset now)
    {
        ActivityAt = now;
        Version++;
    }

    private void Require(params StoryStatus[] allowed)
    {
        if (!allowed.Contains(Status))
        {
            throw new InvalidOperationException($"A {Status} story cannot do that.");
        }
    }
}
