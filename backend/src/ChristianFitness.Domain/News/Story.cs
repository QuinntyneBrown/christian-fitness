namespace ChristianFitness.Domain.News;

/// <summary>Where a story is on its way to readers (L2-068).</summary>
public enum StoryStatus
{
    Draft,
    InReview,

    /// <summary>Waiting for its time; read as Published once the time has passed (ADR 0069, ADR 0104).</summary>
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

    /// <summary>When a Scheduled story goes out; none unless Scheduled (L2-069 AC2, AC4).</summary>
    public DateTimeOffset? PublishAt { get; private set; }

    /// <summary>The Admin who scheduled it; the publishing clock audits its publication against them (ADR 0104).</summary>
    public Guid? ScheduledById { get; private set; }

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
    /// Scheduled one only with Publish now, the action pressed (the save handler refuses it); a
    /// Published one only through Update (<see cref="UpdatePublished"/>). A link changed after the
    /// story was first published keeps the earlier one working (L2-069 AC8).
    /// </summary>
    public void Edit(StoryContent content, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(content);
        Require(now, StoryStatus.Draft, StoryStatus.InReview, StoryStatus.Scheduled);
        Apply(content, now);
        Version++;
    }

    /// <summary>Update on a Published story: the changes are live at once (L2-069 AC5).</summary>
    public void UpdatePublished(StoryContent content, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(content);
        Require(now, StoryStatus.Published);
        StoreDue(now);
        Apply(content, now);
        Version++;
    }

    /// <summary>Send for review: a Draft becomes In review (L2-069 AC2).</summary>
    public void SendForReview(DateTimeOffset now)
    {
        Require(now, StoryStatus.Draft);
        Status = StoryStatus.InReview;
        SubmittedAt = now;
        Touch(now);
    }

    /// <summary>Back to draft: In review becomes a Draft, telling no one (L2-069 AC3).</summary>
    public void ReturnToDraft(DateTimeOffset now)
    {
        Require(now, StoryStatus.InReview);
        Status = StoryStatus.Draft;
        SubmittedAt = null;
        Touch(now);
    }

    /// <summary>Publish now, or Approve &amp; publish: a Draft, In review or Scheduled story goes out (L2-069 AC2, AC3, AC4).</summary>
    public void Publish(DateTimeOffset now)
    {
        Require(now, StoryStatus.Draft, StoryStatus.InReview, StoryStatus.Scheduled);
        GoOut(now, now);
    }

    /// <summary>
    /// Schedule, or Approve &amp; schedule: a Draft or In review story waits for <paramref name="at"/>,
    /// which must be after <paramref name="now"/> (L2-069 AC2, AC3, AC7). <paramref name="by"/> is the
    /// Admin the publication is later audited against (ADR 0104).
    /// </summary>
    public void Schedule(DateTimeOffset at, Guid by, DateTimeOffset now)
    {
        Require(now, StoryStatus.Draft, StoryStatus.InReview);
        if (at <= now)
        {
            throw new ArgumentOutOfRangeException(nameof(at), "A story is scheduled for a time after now.");
        }

        Status = StoryStatus.Scheduled;
        PublishAt = at;
        ScheduledById = by;
        SubmittedAt = null;
        Touch(now);
    }

    /// <summary>Unschedule: a Scheduled story whose time has not come becomes a Draft (L2-069 AC4).</summary>
    public void Unschedule(DateTimeOffset now)
    {
        Require(now, StoryStatus.Scheduled);
        Status = StoryStatus.Draft;
        PublishAt = null;
        ScheduledById = null;
        Touch(now);
    }

    /// <summary>Whether this is a Scheduled story whose time has come, which every read treats as Published (ADR 0069).</summary>
    public bool IsDue(DateTimeOffset now) => Status == StoryStatus.Scheduled && PublishAt <= now;

    /// <summary>The status every read and command goes by: a Scheduled story is Published once its time has come (ADR 0069).</summary>
    public StoryStatus EffectiveStatus(DateTimeOffset now) => IsDue(now) ? StoryStatus.Published : Status;

    /// <summary>When it went out, as readers see it: its scheduled time once that has come (ADR 0069).</summary>
    public DateTimeOffset? EffectivePublishedAt(DateTimeOffset now) => IsDue(now) ? PublishAt : PublishedAt;

    /// <summary>
    /// The publishing clock's tick: a due Scheduled story is stored as Published at its scheduled time,
    /// as reads have shown it since (L2-069 AC4; ADR 0069). Anything else throws.
    /// </summary>
    public void PublishDue(DateTimeOffset now)
    {
        if (!IsDue(now))
        {
            throw new InvalidOperationException("Only a Scheduled story whose time has come is published by the clock.");
        }

        GoOut(PublishAt!.Value, now);
    }

    /// <summary>Unpublish: the story becomes a Draft and leaves readers at once (L2-069 AC5).</summary>
    public void Unpublish(DateTimeOffset now)
    {
        Require(now, StoryStatus.Published);
        StoreDue(now);
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

    /// <summary>A due Scheduled story acted on as Published is first stored as Published at its time.</summary>
    private void StoreDue(DateTimeOffset now)
    {
        if (IsDue(now))
        {
            GoOut(PublishAt!.Value, now);
        }
    }

    private void GoOut(DateTimeOffset at, DateTimeOffset now)
    {
        Status = StoryStatus.Published;
        PublishedAt = at;
        FirstPublishedAt ??= at;
        SubmittedAt = null;
        PublishAt = null;
        ScheduledById = null;
        Touch(now);
    }

    private void Touch(DateTimeOffset now)
    {
        ActivityAt = now;
        Version++;
    }

    /// <summary>A transition goes by the effective status: a due Scheduled story is Published and can no longer be unscheduled (ADR 0069).</summary>
    private void Require(DateTimeOffset now, params StoryStatus[] allowed)
    {
        var status = EffectiveStatus(now);
        if (!allowed.Contains(status))
        {
            throw new InvalidOperationException($"A {status} story cannot do that.");
        }
    }
}
