using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Domain.News;
using FluentValidation;
using MediatR;

namespace ChristianFitness.Application.News;

/// <summary>A status action's story, from the route, and the version the editor read (L2-069 AC12).</summary>
public abstract class StoryActionBody
{
    /// <summary>The story, from the route.</summary>
    public Guid Id { get; set; }

    /// <summary>The version the editor last read; any other is refused with <c>story_changed</c>.</summary>
    public int? Version { get; set; }
}

/// <summary>Send for review: a Draft becomes In review (L2-069 AC2). Audited <c>story.submitted</c>.</summary>
public sealed class SubmitStoryCommand : StoryActionBody, IRequest<AdminStoryDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "story.submitted";
}

/// <summary>Back to draft: a story In review becomes a Draft, telling no one (L2-069 AC3). Audited <c>story.returned_to_draft</c>.</summary>
public sealed class ReturnStoryToDraftCommand : StoryActionBody, IRequest<AdminStoryDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "story.returned_to_draft";
}

/// <summary>
/// Publish now, or Approve &amp; publish (L2-069 AC2, AC3, AC6, AC7): saves the fields over the
/// version the editor read, then publishes a Draft or a story In review at once, under its link or
/// one made from its headline. Audited <c>story.published</c>.
/// </summary>
public sealed class PublishStoryCommand : StorySaveFields, IRequest<AdminStoryDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "story.published";
}

internal sealed class SubmitStoryValidator : AbstractValidator<SubmitStoryCommand>
{
    public SubmitStoryValidator() =>
        RuleFor(c => c.Version).NotNull().WithErrorCode(StoryRules.VersionRequired).WithMessage("Open the story again");
}

internal sealed class ReturnStoryToDraftValidator : AbstractValidator<ReturnStoryToDraftCommand>
{
    public ReturnStoryToDraftValidator() =>
        RuleFor(c => c.Version).NotNull().WithErrorCode(StoryRules.VersionRequired).WithMessage("Open the story again");
}

/// <summary>
/// What a story needs to go out (L2-069 AC7; ADR 0097): a headline, text, a section and a byline,
/// named in that order, on top of every field's own rule. Nothing is saved when one is missing.
/// </summary>
internal sealed class PublishStoryValidator : StoryFieldsValidator<PublishStoryCommand>
{
    public PublishStoryValidator(IAppDbContext db, IImageStore images)
        : base(db, images)
    {
        RuleFor(c => c.Version).NotNull().WithErrorCode(StoryRules.VersionRequired).WithMessage("Open the story again");
        RuleFor(c => c.Headline)
            .Must(headline => !string.IsNullOrWhiteSpace(headline))
            .WithErrorCode("headline_required").WithMessage("Write a headline");
        RuleFor(c => c.Text)
            .Must(text => !string.IsNullOrWhiteSpace(text))
            .WithErrorCode("text_required").WithMessage("Write the story");
        RuleFor(c => c.Section)
            .NotEmpty()
            .WithErrorCode("section_required").WithMessage("Choose a section");
        RuleFor(c => c.BylineId)
            .NotNull()
            .WithErrorCode("byline_required").WithMessage("Choose a byline");
    }
}

/// <summary>Finds a story for a status action, refusing an unknown one and a version not seen.</summary>
internal static class StoryActions
{
    public const string RecordType = nameof(Story);

    public static async Task<Story> FindAsync(IAppDbContext db, Guid id, int? version, CancellationToken cancellationToken)
    {
        var story = await StoryAnswers.FindAsync(db, id, cancellationToken).ConfigureAwait(false);
        StoryAnswers.RequireVersion(story, version);
        return story;
    }

    /// <summary>Runs a transition the domain allows; one it does not is 409 <c>status_conflict</c>.</summary>
    public static void Change(Action transition)
    {
        try
        {
            transition();
        }
        catch (InvalidOperationException exception)
        {
            throw new RefusalException(RefusalCodes.StatusConflict, RefusalKind.Conflict, exception);
        }
    }

    /// <summary>
    /// The link a story goes out under (L2-069 AC8): its own, or one made from its headline that no
    /// other story holds now or held before, numbered from 2 on a clash.
    /// </summary>
    public static async Task<string> SlugOfAsync(IAppDbContext db, Story story, CancellationToken cancellationToken)
    {
        if (story.Slug is { } own)
        {
            return own;
        }

        var made = StorySlug.From(story.Headline);
        var slug = made;
        for (var n = 2; await StoryAnswers.SlugTakenAsync(db, slug, story.Id, cancellationToken).ConfigureAwait(false); n++)
        {
            slug = StorySlug.Numbered(made, n);
        }

        return slug;
    }
}

internal sealed class SubmitStoryHandler(IAppDbContext db, TimeProvider time, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<SubmitStoryCommand, AdminStoryDto>
{
    public async Task<AdminStoryDto> Handle(SubmitStoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var story = await StoryActions.FindAsync(db, request.Id, request.Version, cancellationToken).ConfigureAwait(false);
        StoryActions.Change(() => story.SendForReview(time.GetUtcNow()));
        audit.Record(current.Id, StoryActions.RecordType, story.Id);
        await StoryAnswers.SaveAsync(db, story, cancellationToken).ConfigureAwait(false);
        return StoryAnswers.Of(story);
    }
}

internal sealed class ReturnStoryToDraftHandler(IAppDbContext db, TimeProvider time, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<ReturnStoryToDraftCommand, AdminStoryDto>
{
    public async Task<AdminStoryDto> Handle(ReturnStoryToDraftCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var story = await StoryActions.FindAsync(db, request.Id, request.Version, cancellationToken).ConfigureAwait(false);
        StoryActions.Change(() => story.ReturnToDraft(time.GetUtcNow()));
        audit.Record(current.Id, StoryActions.RecordType, story.Id);
        await StoryAnswers.SaveAsync(db, story, cancellationToken).ConfigureAwait(false);
        return StoryAnswers.Of(story);
    }
}

internal sealed class PublishStoryHandler(IAppDbContext db, TimeProvider time, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<PublishStoryCommand, AdminStoryDto>
{
    public async Task<AdminStoryDto> Handle(PublishStoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var story = await StoryActions.FindAsync(db, request.Id, request.Version, cancellationToken).ConfigureAwait(false);
        var now = time.GetUtcNow();
        StoryActions.Change(() => story.Edit(request.ToContent(), now));
        story.SetSlug(await StoryActions.SlugOfAsync(db, story, cancellationToken).ConfigureAwait(false));
        StoryActions.Change(() => story.Publish(now));
        audit.Record(current.Id, StoryActions.RecordType, story.Id);
        await StoryAnswers.SaveAsync(db, story, cancellationToken).ConfigureAwait(false);
        return StoryAnswers.Of(story);
    }
}
