using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Newsletter;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Newsletter;

/// <summary>What the desk sends for an issue: what is written and what is picked (L2-070 AC2).</summary>
public abstract class IssueFields
{
    /// <summary>The issue, from the route.</summary>
    public int Number { get; set; }

    public string? Subject { get; set; }

    public string? EditorsNote { get; set; }

    public Guid? LeadStoryId { get; set; }

    public IReadOnlyList<Guid>? AlsoStoryIds { get; set; }

    public IReadOnlyList<Guid>? EventIds { get; set; }

    public string? Verse { get; set; }

    public string? VerseReference { get; set; }

    /// <summary>The fields as the issue keeps them: text trimmed, picks without repeats.</summary>
    internal NewsletterIssue.Content ToContent() => new(
        (Subject ?? string.Empty).Trim(),
        (EditorsNote ?? string.Empty).Trim(),
        LeadStoryId,
        [.. (AlsoStoryIds ?? []).Distinct()],
        [.. (EventIds ?? []).Distinct()],
        (Verse ?? string.Empty).Trim(),
        (VerseReference ?? string.Empty).Trim());
}

/// <summary>
/// Saves a Draft issue as it stands, complete or not (L2-070 AC14): the autosave. An unknown issue
/// is 404 <c>issue_not_found</c>; one no longer a Draft is 409 <c>status_conflict</c>.
/// </summary>
public sealed class SaveIssueCommand : IssueFields, IRequest<IssueSavedDto>;

/// <summary>When the draft was saved, for "Saved {time}".</summary>
public sealed record IssueSavedDto(DateTimeOffset SavedAt);

/// <summary>The field codes the desk's endpoints refuse with, named in <c>fieldCodes</c>.</summary>
public static class IssueRules
{
    public const string TooManyStories = "too_many_stories";

    /// <summary>A story picked is not published now (L2-070 AC2).</summary>
    public const string StoryUnavailable = "story_unavailable";

    /// <summary>An event picked is not published or has started (L2-070 AC2).</summary>
    public const string EventUnavailable = "event_unavailable";

    public static readonly IReadOnlySet<string> FieldCodes = new HashSet<string>(StringComparer.Ordinal)
    {
        "subject_too_long", "editors_note_too_long", "verse_too_long", "verse_reference_too_long", TooManyStories, "too_many_events",
        "subject_required", "editors_note_required", "lead_story_required", StoryUnavailable, EventUnavailable,
    };
}

/// <summary>The limits every save and schedule share; the sentences never repeat a value.</summary>
internal abstract class IssueFieldsValidator<T> : AbstractValidator<T>
    where T : IssueFields
{
    protected IssueFieldsValidator()
    {
        RuleLevelCascadeMode = CascadeMode.Stop;
        RuleFor(c => c.Subject).Must(Fits(NewsletterIssue.SubjectMaxLength)).WithErrorCode("subject_too_long").WithMessage("Use 150 characters or fewer");
        RuleFor(c => c.EditorsNote).Must(Fits(NewsletterIssue.EditorsNoteMaxLength)).WithErrorCode("editors_note_too_long").WithMessage("Use 2,000 characters or fewer");
        RuleFor(c => c.Verse).Must(Fits(NewsletterIssue.VerseMaxLength)).WithErrorCode("verse_too_long").WithMessage("Use 400 characters or fewer");
        RuleFor(c => c.VerseReference).Must(Fits(NewsletterIssue.VerseReferenceMaxLength)).WithErrorCode("verse_reference_too_long").WithMessage("Use 60 characters or fewer");
        RuleFor(c => c.AlsoStoryIds)
            .Must(ids => (ids ?? []).Distinct().Count() <= NewsletterIssue.AlsoStoriesMax)
            .WithErrorCode(IssueRules.TooManyStories).WithMessage("Choose up to three more stories");
        RuleFor(c => c.EventIds)
            .Must(ids => (ids ?? []).Distinct().Count() <= NewsletterIssue.EventsMax)
            .WithErrorCode("too_many_events").WithMessage("Choose up to four events");
    }

    private static Func<string?, bool> Fits(int max) => text => (text ?? string.Empty).Trim().Length <= max;
}

internal sealed class SaveIssueValidator : IssueFieldsValidator<SaveIssueCommand>;

/// <summary>Finds the issue an endpoint names, and refuses one that is locked.</summary>
internal static class Issues
{
    public static async Task<NewsletterIssue> FindAsync(IAppDbContext db, int number, CancellationToken cancellationToken) =>
        await db.NewsletterIssues.SingleOrDefaultAsync(i => i.Number == number, cancellationToken).ConfigureAwait(false)
        ?? throw new RefusalException(RefusalCodes.IssueNotFound, RefusalKind.NotFound);

    public static async Task<NewsletterIssue> FindDraftAsync(IAppDbContext db, int number, CancellationToken cancellationToken)
    {
        var issue = await FindAsync(db, number, cancellationToken).ConfigureAwait(false);
        return issue.IsDraft ? issue : throw new RefusalException(RefusalCodes.StatusConflict, RefusalKind.Conflict);
    }
}

internal sealed class SaveIssueHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<SaveIssueCommand, IssueSavedDto>
{
    public async Task<IssueSavedDto> Handle(SaveIssueCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var issue = await Issues.FindDraftAsync(db, request.Number, cancellationToken).ConfigureAwait(false);
        issue.Write(request.ToContent());
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new IssueSavedDto(time.GetUtcNow());
    }
}
