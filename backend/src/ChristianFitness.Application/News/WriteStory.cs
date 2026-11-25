using System.Text.RegularExpressions;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.News;
using FluentValidation;
using FluentValidation.Results;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.News;

/// <summary>What a story points readers to: an event or a directory listing (L2-069 AC7).</summary>
public sealed record StoryPointerDto(string Kind, Guid Id);

/// <summary>The lead image's original and the rectangle of it the story shows (ADR 0097).</summary>
public sealed record StoryCropDto(int X, int Y, int Width, int Height);

/// <summary>The lead image: its key and crop.</summary>
public sealed record StoryImageDto(string Key, StoryCropDto Crop);

/// <summary>A story as the editor reads it (L2-069; ADR 0097). <c>savedAt</c> is the last save.</summary>
public sealed record AdminStoryDto(
    Guid Id,
    string Status,
    int Version,
    string Headline,
    string Summary,
    string Text,
    string? Section,
    Guid? BylineId,
    string Placement,
    bool IncludeInWeekly,
    StoryPointerDto? PointsTo,
    string? NextStepText,
    string? NextStepLink,
    string? Slug,
    StoryImageDto? Image,
    DateTimeOffset SavedAt,
    DateTimeOffset? PublishedAt);

/// <summary>A choice the editor offers: a byline, event or listing by its id and name.</summary>
public sealed record StoryChoiceDto(Guid Id, string Name);

/// <summary>An event a story can point to, by its title.</summary>
public sealed record StoryEventChoiceDto(Guid Id, string Title);

/// <summary>The editor's choices (L2-069 AC1, AC7): the bylines by name, the published upcoming events by start and the listed listings by name.</summary>
public sealed record StoryOptionsDto(IReadOnlyList<StoryChoiceDto> Bylines, IReadOnlyList<StoryEventChoiceDto> Events, IReadOnlyList<StoryChoiceDto> Listings);

/// <summary>A pointer as the editor sends it.</summary>
public sealed class StoryPointerBody
{
    public string? Kind { get; set; }

    public Guid? Id { get; set; }
}

/// <summary>A crop as the editor sends it.</summary>
public sealed class StoryCropBody
{
    public int X { get; set; }

    public int Y { get; set; }

    public int Width { get; set; }

    public int Height { get; set; }
}

/// <summary>The lead image as the editor sends it.</summary>
public sealed class StoryImageBody
{
    public string? Key { get; set; }

    public StoryCropBody? Crop { get; set; }
}

/// <summary>
/// What the editor sends (L2-069 AC1): every field may be empty while a story is written; what a
/// story needs before review or publication is checked then (ADR 0097).
/// </summary>
public abstract class StoryFields
{
    public string? Headline { get; set; }

    public string? Summary { get; set; }

    public string? Text { get; set; }

    public string? Section { get; set; }

    public Guid? BylineId { get; set; }

    public string? Placement { get; set; }

    public bool IncludeInWeekly { get; set; }

    public StoryPointerBody? PointsTo { get; set; }

    public string? NextStepText { get; set; }

    public string? NextStepLink { get; set; }

    public string? Slug { get; set; }

    public StoryImageBody? Image { get; set; }

    /// <summary>The story the fields belong to, from the route; none for a new story.</summary>
    internal virtual Guid? StoryId => null;

    /// <summary>The fields as the domain keeps them, trimmed, with empty choices as none.</summary>
    internal StoryContent ToContent() => new(
        (Headline ?? string.Empty).Trim(),
        (Summary ?? string.Empty).Trim(),
        Text ?? string.Empty,
        StoryNames.SectionOf(Section),
        BylineId,
        StoryNames.PlacementOf(Placement) ?? StoryPlacement.Latest,
        IncludeInWeekly,
        StoryNames.PointerOf(PointsTo?.Kind) ?? StoryPointer.None,
        PointsTo?.Id,
        NextStepText,
        NextStepLink,
        string.IsNullOrWhiteSpace(Slug) ? null : Slug.Trim(),
        Image?.Key,
        Image?.Crop is { } crop ? new StoryCrop(crop.X, crop.Y, crop.Width, crop.Height) : null);
}

/// <summary>The fields with the version they were written over (L2-069 AC12).</summary>
public abstract class StorySaveFields : StoryFields
{
    /// <summary>The story, from the route.</summary>
    public Guid Id { get; set; }

    /// <summary>The version the editor last read; a save over any other is refused with <c>story_changed</c>.</summary>
    public int? Version { get; set; }

    internal override Guid? StoryId => Id;
}

/// <summary>New story (L2-069 AC1): an empty Draft, or one holding what was written. Not audited, as no save of a draft is.</summary>
public sealed class CreateStoryCommand : StoryFields, IRequest<AdminStoryDto>;

/// <summary>The editor's autosave of a Draft or a story In review (L2-069 AC8). Not audited (ADR 0097).</summary>
public sealed class SaveStoryCommand : StorySaveFields, IRequest<AdminStoryDto>;

/// <summary>One story for the editor; an unknown one is 404 <c>not_found</c>.</summary>
public sealed record GetAdminStoryQuery(Guid Id) : IRequest<AdminStoryDto>;

/// <summary>The editor's choices.</summary>
public sealed record GetStoryOptionsQuery : IRequest<StoryOptionsDto>
{
    /// <summary>At most this many events and listings are offered.</summary>
    public const int Limit = 200;
}

/// <summary>Builds the editor's answer and the save every write shares.</summary>
internal static partial class StoryAnswers
{
    public static AdminStoryDto Of(Story story) => new(
        story.Id,
        StoryNames.Of(story.Status),
        story.Version,
        story.Headline,
        story.Summary,
        story.Text,
        StoryNames.Of(story.Section),
        story.BylineId,
        StoryNames.Of(story.Placement),
        story.IncludeInWeekly,
        story.PointsTo == StoryPointer.None || story.PointsToId is null ? null : new StoryPointerDto(StoryNames.Of(story.PointsTo), story.PointsToId.Value),
        story.NextStepText,
        story.NextStepLink,
        story.Slug,
        story.ImageKey is { } key && story.ImageCrop is { } crop ? new StoryImageDto(key, new StoryCropDto(crop.X, crop.Y, crop.Width, crop.Height)) : null,
        story.EditedAt,
        story.PublishedAt);

    public static async Task<Story> FindAsync(IAppDbContext db, Guid id, CancellationToken cancellationToken) =>
        await db.Stories.SingleOrDefaultAsync(s => s.Id == id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);

    /// <summary>Refuses a write over a version the writer has not read (L2-069 AC12).</summary>
    public static void RequireVersion(Story story, int? version)
    {
        if (story.Version != version)
        {
            throw Changed();
        }
    }

    public static RefusalException Changed(Exception? inner = null) => new(RefusalCodes.StoryChanged, RefusalKind.Conflict, inner);

    public static RefusalException StatusConflict() => new(RefusalCodes.StatusConflict, RefusalKind.Conflict);

    /// <summary>Whether another story holds <paramref name="slug"/>, now or as a former link.</summary>
    public static Task<bool> SlugTakenAsync(IAppDbContext db, string slug, Guid? except, CancellationToken cancellationToken) =>
        db.Stories.AnyAsync(s => s.Id != except && (s.Slug == slug || s.FormerSlugs.Contains(slug)), cancellationToken);

    public static ValidationException SlugTaken() =>
        new([new ValidationFailure("Slug", "Choose another link: another story uses this one") { ErrorCode = StoryRules.SlugTaken }]);

    /// <summary>
    /// Saves, answering a save over a version written meanwhile with <c>story_changed</c>, and a
    /// lost race for a link with <c>slug_taken</c> (L2-069 AC12; ADR 0097).
    /// </summary>
    public static async Task SaveAsync(IAppDbContext db, Story story, CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (DbUpdateConcurrencyException exception)
        {
            db.Stories.Entry(story).State = EntityState.Detached;
            throw Changed(exception);
        }
        catch (DbUpdateException)
        {
            var entry = db.Stories.Entry(story);
            entry.State = entry.State == EntityState.Added ? EntityState.Detached : EntityState.Unchanged;
            if (story.Slug is { } slug && await SlugTakenAsync(db, slug, story.Id, cancellationToken).ConfigureAwait(false))
            {
                throw SlugTaken();
            }

            throw;
        }
    }

    /// <summary>A next step's link: a page of the app ("/events/…") or a secure address elsewhere (ADR 0097).</summary>
    public static bool IsNextStepLink(string? link)
    {
        if (string.IsNullOrWhiteSpace(link))
        {
            return true;
        }

        var value = link.Trim();
        if (value.Length > Story.NextStepLinkMaxLength)
        {
            return false;
        }

        if (value.StartsWith('/'))
        {
            return InternalPath().IsMatch(value);
        }

        return Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps && !string.IsNullOrEmpty(uri.Host);
    }

    [GeneratedRegex(@"^/(?![/\\])[^\s\\]*$", RegexOptions.CultureInvariant)]
    private static partial Regex InternalPath();
}

/// <summary>Each field's rule while a story is written (L2-069 AC1, AC7, AC10; ADR 0097); the sentences never repeat a value.</summary>
internal abstract class StoryFieldsValidator<T> : AbstractValidator<T>
    where T : StoryFields
{
    protected StoryFieldsValidator(IAppDbContext db, IImageStore images)
    {
        RuleLevelCascadeMode = CascadeMode.Stop;
        RuleFor(c => c.Headline)
            .Must(headline => (headline ?? string.Empty).Trim().Length <= Story.HeadlineMaxLength)
            .WithErrorCode("headline_too_long").WithMessage("Use 160 characters or fewer");
        RuleFor(c => c.Summary)
            .Must(summary => (summary ?? string.Empty).Trim().Length <= Story.SummaryMaxLength)
            .WithErrorCode("summary_too_long").WithMessage("Use 300 characters or fewer");
        RuleFor(c => c.Text)
            .Must(text => (text ?? string.Empty).Length <= Story.TextMaxLength)
            .WithErrorCode("text_too_long").WithMessage("Use 50,000 characters or fewer");
        RuleFor(c => c.Section)
            .Must(section => section is null || StoryNames.SectionOf(section) is not null)
            .WithErrorCode("section_invalid").WithMessage("Choose a section");
        RuleFor(c => c.Placement)
            .Must(placement => placement is null || StoryNames.PlacementOf(placement) is not null)
            .WithErrorCode("placement_invalid").WithMessage("Choose Lead, Top story or Latest");
        RuleFor(c => c.BylineId)
            .MustAsync((id, cancellationToken) => db.Bylines.AnyAsync(b => b.Id == id, cancellationToken))
            .When(c => c.BylineId is not null)
            .WithErrorCode("byline_invalid").WithMessage("Choose a byline");
        RuleFor(c => c.NextStepText)
            .Must(text => (text ?? string.Empty).Trim().Length <= Story.NextStepTextMaxLength)
            .WithErrorCode("next_step_too_long").WithMessage("Use 80 characters or fewer");
        RuleFor(c => c.NextStepLink)
            .Must(StoryAnswers.IsNextStepLink)
            .WithErrorCode("next_step_link_invalid").WithMessage("Use a page of the app, starting /, or an https address");
        RuleFor(c => c.Slug)
            .Must(slug => string.IsNullOrWhiteSpace(slug) || StorySlug.IsValid(slug.Trim()))
            .WithErrorCode("slug_invalid").WithMessage("Use lower-case letters, numbers and single hyphens, up to 80")
            .MustAsync(async (fields, slug, cancellationToken) =>
                string.IsNullOrWhiteSpace(slug) || !await StoryAnswers.SlugTakenAsync(db, slug.Trim(), fields.StoryId, cancellationToken).ConfigureAwait(false))
            .WithErrorCode(StoryRules.SlugTaken).WithMessage("Choose another link: another story uses this one");
        RuleFor(c => c.Image)
            .MustAsync(async (image, cancellationToken) => ImageKeys.IsKey(image!.Key) && await images.ExistsAsync(image.Key!, cancellationToken).ConfigureAwait(false))
            .When(c => c.Image is not null)
            .WithErrorCode("image_invalid").WithMessage("Choose the image again")
            .Must(image => image!.Crop is { X: >= 0, Y: >= 0, Width: > 0, Height: > 0 })
            .When(c => c.Image is not null)
            .WithErrorCode("crop_invalid").WithMessage("Choose the crop again");
        RuleFor(c => c.PointsTo)
            .MustAsync(async (pointer, cancellationToken) => pointer!.Id is { } id && StoryNames.PointerOf(pointer.Kind) switch
            {
                StoryPointer.Event => await db.Events.AnyAsync(e => e.Id == id && e.Status == EventStatus.Published, cancellationToken).ConfigureAwait(false),
                StoryPointer.Listing => await db.DirectoryListings.AnyAsync(l => l.Id == id && l.Status == ListingStatus.Published, cancellationToken).ConfigureAwait(false),
                _ => false,
            })
            .When(c => c.PointsTo is not null)
            .WithErrorCode("points_to_invalid").WithMessage("Choose a published event or a listed listing");
    }
}

internal sealed class CreateStoryValidator(IAppDbContext db, IImageStore images) : StoryFieldsValidator<CreateStoryCommand>(db, images);

internal sealed class SaveStoryValidator : StoryFieldsValidator<SaveStoryCommand>
{
    public SaveStoryValidator(IAppDbContext db, IImageStore images)
        : base(db, images) =>
        RuleFor(c => c.Version).NotNull().WithErrorCode(StoryRules.VersionRequired).WithMessage("Open the story again");
}

internal sealed class CreateStoryHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<CreateStoryCommand, AdminStoryDto>
{
    public async Task<AdminStoryDto> Handle(CreateStoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var story = Story.Create(request.ToContent(), time.GetUtcNow());
        db.Stories.Add(story);
        await StoryAnswers.SaveAsync(db, story, cancellationToken).ConfigureAwait(false);
        return StoryAnswers.Of(story);
    }
}

/// <summary>Keeps what was typed in a Draft or a story In review; a Published story changes only on Update (L2-069 AC8, AC11).</summary>
internal sealed class SaveStoryHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<SaveStoryCommand, AdminStoryDto>
{
    public async Task<AdminStoryDto> Handle(SaveStoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var story = await StoryAnswers.FindAsync(db, request.Id, cancellationToken).ConfigureAwait(false);
        if (story.Status is not (StoryStatus.Draft or StoryStatus.InReview))
        {
            throw StoryAnswers.StatusConflict();
        }

        StoryAnswers.RequireVersion(story, request.Version);
        story.Edit(request.ToContent(), time.GetUtcNow());
        await StoryAnswers.SaveAsync(db, story, cancellationToken).ConfigureAwait(false);
        return StoryAnswers.Of(story);
    }
}

internal sealed class GetAdminStoryHandler(IAppDbContext db) : IRequestHandler<GetAdminStoryQuery, AdminStoryDto>
{
    public async Task<AdminStoryDto> Handle(GetAdminStoryQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var story = await db.Stories.AsNoTracking().SingleOrDefaultAsync(s => s.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        return StoryAnswers.Of(story);
    }
}

internal sealed class GetStoryOptionsHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<GetStoryOptionsQuery, StoryOptionsDto>
{
    public async Task<StoryOptionsDto> Handle(GetStoryOptionsQuery request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var bylines = await db.Bylines.AsNoTracking()
            .OrderBy(b => b.NameKey).ThenBy(b => b.Id)
            .Select(b => new StoryChoiceDto(b.Id, b.Name))
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        var events = await db.Events.AsNoTracking()
            .Where(e => e.Status == EventStatus.Published && e.StartsAt > now)
            .OrderBy(e => e.StartsAt).ThenBy(e => e.Id)
            .Take(GetStoryOptionsQuery.Limit)
            .Select(e => new StoryEventChoiceDto(e.Id, e.Title))
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        var listings = await db.DirectoryListings.AsNoTracking()
            .Where(l => l.Status == ListingStatus.Published)
            .OrderBy(l => l.NameKey).ThenBy(l => l.Id)
            .Take(GetStoryOptionsQuery.Limit)
            .Select(l => new StoryChoiceDto(l.Id, l.Name))
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        return new StoryOptionsDto(bylines, events, listings);
    }
}
