using System.Globalization;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Events;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Domain.Audit;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.News;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

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

/// <summary>
/// Update on a Published story (L2-069 AC5, AC6, AC8): saves the fields over the version the editor
/// read and the changes are live at once; a changed link keeps the earlier one working. Audited
/// <c>story.updated</c>.
/// </summary>
public sealed class UpdateStoryCommand : StorySaveFields, IRequest<AdminStoryDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "story.updated";
}

/// <summary>
/// Schedule, or Approve &amp; schedule (L2-069 AC2, AC3, AC7; ADR 0104): saves the fields over the
/// version the editor read, then makes a Draft or a story In review Scheduled for the Toronto
/// <see cref="PublishDate"/> (<c>yyyy-MM-dd</c>) and <see cref="PublishTime"/> (<c>HH:mm</c>), which
/// must be after now. It has Publish's rules too. Audited <c>story.scheduled</c>.
/// </summary>
public sealed class ScheduleStoryCommand : StorySaveFields, IRequest<AdminStoryDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "story.scheduled";

    public string? PublishDate { get; set; }

    public string? PublishTime { get; set; }

    internal DateOnly? ParsedDate() =>
        DateOnly.TryParseExact(PublishDate, EventFields.DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) ? date : null;

    internal TimeOnly? ParsedTime() =>
        TimeOnly.TryParseExact(PublishTime, EventFields.TimeFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var time) ? time : null;

    /// <summary>The instant it goes out, or none while the date or time is missing.</summary>
    internal DateTimeOffset? PublishAt() =>
        ParsedDate() is { } date && ParsedTime() is { } time ? EventSchedule.StartOf(date, time) : null;
}

/// <summary>Unschedule: a Scheduled story whose time has not come becomes a Draft (L2-069 AC4). Audited <c>story.unscheduled</c>.</summary>
public sealed class UnscheduleStoryCommand : StoryActionBody, IRequest<AdminStoryDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "story.unscheduled";
}

/// <summary>Unpublish: a Published story becomes a Draft and leaves readers at once (L2-069 AC5). Audited <c>story.unpublished</c>.</summary>
public sealed class UnpublishStoryCommand : StoryActionBody, IRequest<AdminStoryDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "story.unpublished";
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

internal sealed class UnpublishStoryValidator : AbstractValidator<UnpublishStoryCommand>
{
    public UnpublishStoryValidator() =>
        RuleFor(c => c.Version).NotNull().WithErrorCode(StoryRules.VersionRequired).WithMessage("Open the story again");
}

internal sealed class UnscheduleStoryValidator : AbstractValidator<UnscheduleStoryCommand>
{
    public UnscheduleStoryValidator() =>
        RuleFor(c => c.Version).NotNull().WithErrorCode(StoryRules.VersionRequired).WithMessage("Open the story again");
}

/// <summary>
/// Schedule's rules (L2-069 AC7): Publish's, then a Toronto date and a time, together after now,
/// named on the date as Add a date names a start in the past.
/// </summary>
internal sealed class ScheduleStoryValidator : StoryGoesOutValidator<ScheduleStoryCommand>
{
    public ScheduleStoryValidator(IAppDbContext db, IImageStore images, TimeProvider time)
        : base(db, images)
    {
        ArgumentNullException.ThrowIfNull(time);
        RuleFor(c => c.PublishDate)
            .Must((command, _) => command.ParsedDate() is not null)
            .WithErrorCode(StoryRules.PublishDateRequired).WithMessage("Pick a date")
            .Must((command, _) => command.PublishAt() is not { } at || at > time.GetUtcNow())
            .WithErrorCode(StoryRules.PublishAtInPast).WithMessage("Pick a date and time after now");
        RuleFor(c => c.PublishTime)
            .Must((command, _) => command.ParsedTime() is not null)
            .WithErrorCode(StoryRules.PublishTimeRequired).WithMessage("Pick a time");
    }
}

internal sealed class PublishStoryValidator(IAppDbContext db, IImageStore images) : StoryGoesOutValidator<PublishStoryCommand>(db, images);

internal sealed class UpdateStoryValidator(IAppDbContext db, IImageStore images) : StoryGoesOutValidator<UpdateStoryCommand>(db, images);

/// <summary>
/// What a story needs to go out, by Publish or Update (L2-069 AC5, AC7; ADR 0097): a headline,
/// text, a section and a byline, named in that order, on top of every field's own rule. Nothing is
/// saved when one is missing.
/// </summary>
internal abstract class StoryGoesOutValidator<T> : StoryFieldsValidator<T>
    where T : StorySaveFields
{
    protected StoryGoesOutValidator(IAppDbContext db, IImageStore images)
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

    /// <summary>The audit action of a publication, by an Admin or by the clock.</summary>
    public const string PublishedAction = "story.published";

    public static async Task<Story> FindAsync(IAppDbContext db, Guid id, int? version, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var story = await StoryAnswers.FindAsync(db, id, cancellationToken).ConfigureAwait(false);
        StoryAnswers.RequireVersion(story, version);
        CatchUp(db, story, now);
        return story;
    }

    /// <summary>
    /// A Scheduled story whose time has come is Published (ADR 0069): before a command acts on it,
    /// the publication the clock has not stored yet is stored with the command, audited
    /// <c>story.published</c> against the Admin who scheduled it, as the clock would. Its version
    /// guards against the clock storing it too, so the publication is audited once (ADR 0104).
    /// </summary>
    public static void CatchUp(IAppDbContext db, Story story, DateTimeOffset now)
    {
        if (!story.IsDue(now))
        {
            return;
        }

        var by = story.ScheduledById ?? Guid.Empty;
        story.PublishDue(now);
        db.AuditEntries.Add(AuditEntry.Record(by, PublishedAction, RecordType, story.Id, now));
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

    /// <summary>
    /// Only one story is the Lead (L2-069 AC6): when <paramref name="story"/> goes out as the Lead,
    /// every other Published Lead becomes an ordinary story at its own publish time.
    /// </summary>
    public static async Task TakeLeadAsync(IAppDbContext db, Story story, CancellationToken cancellationToken)
    {
        if (story.Placement != StoryPlacement.Lead)
        {
            return;
        }

        var others = await db.Stories
            .Where(s => s.Id != story.Id && s.Status == StoryStatus.Published && s.Placement == StoryPlacement.Lead)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        foreach (var other in others)
        {
            other.GiveUpLead();
        }
    }
}

internal sealed class SubmitStoryHandler(IAppDbContext db, TimeProvider time, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<SubmitStoryCommand, AdminStoryDto>
{
    public async Task<AdminStoryDto> Handle(SubmitStoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var now = time.GetUtcNow();
        var story = await StoryActions.FindAsync(db, request.Id, request.Version, now, cancellationToken).ConfigureAwait(false);
        StoryActions.Change(() => story.SendForReview(now));
        audit.Record(current.Id, StoryActions.RecordType, story.Id);
        await StoryAnswers.SaveAsync(db, story, cancellationToken).ConfigureAwait(false);
        return StoryAnswers.Of(story, now);
    }
}

internal sealed class ReturnStoryToDraftHandler(IAppDbContext db, TimeProvider time, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<ReturnStoryToDraftCommand, AdminStoryDto>
{
    public async Task<AdminStoryDto> Handle(ReturnStoryToDraftCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var now = time.GetUtcNow();
        var story = await StoryActions.FindAsync(db, request.Id, request.Version, now, cancellationToken).ConfigureAwait(false);
        StoryActions.Change(() => story.ReturnToDraft(now));
        audit.Record(current.Id, StoryActions.RecordType, story.Id);
        await StoryAnswers.SaveAsync(db, story, cancellationToken).ConfigureAwait(false);
        return StoryAnswers.Of(story, now);
    }
}

internal sealed class PublishStoryHandler(IAppDbContext db, TimeProvider time, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<PublishStoryCommand, AdminStoryDto>
{
    public async Task<AdminStoryDto> Handle(PublishStoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var now = time.GetUtcNow();
        var story = await StoryActions.FindAsync(db, request.Id, request.Version, now, cancellationToken).ConfigureAwait(false);
        StoryActions.Change(() => story.Edit(request.ToContent(), now));
        story.SetSlug(await StoryActions.SlugOfAsync(db, story, cancellationToken).ConfigureAwait(false));
        StoryActions.Change(() => story.Publish(now));
        await StoryActions.TakeLeadAsync(db, story, cancellationToken).ConfigureAwait(false);
        audit.Record(current.Id, StoryActions.RecordType, story.Id);
        await StoryAnswers.SaveAsync(db, story, cancellationToken).ConfigureAwait(false);
        return StoryAnswers.Of(story, now);
    }
}

internal sealed class UpdateStoryHandler(IAppDbContext db, TimeProvider time, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<UpdateStoryCommand, AdminStoryDto>
{
    public async Task<AdminStoryDto> Handle(UpdateStoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var now = time.GetUtcNow();
        var story = await StoryActions.FindAsync(db, request.Id, request.Version, now, cancellationToken).ConfigureAwait(false);
        StoryActions.Change(() => story.UpdatePublished(request.ToContent(), now));
        await StoryActions.TakeLeadAsync(db, story, cancellationToken).ConfigureAwait(false);
        audit.Record(current.Id, StoryActions.RecordType, story.Id);
        await StoryAnswers.SaveAsync(db, story, cancellationToken).ConfigureAwait(false);
        return StoryAnswers.Of(story, now);
    }
}

internal sealed class UnpublishStoryHandler(IAppDbContext db, TimeProvider time, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<UnpublishStoryCommand, AdminStoryDto>
{
    public async Task<AdminStoryDto> Handle(UnpublishStoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var now = time.GetUtcNow();
        var story = await StoryActions.FindAsync(db, request.Id, request.Version, now, cancellationToken).ConfigureAwait(false);
        StoryActions.Change(() => story.Unpublish(now));
        audit.Record(current.Id, StoryActions.RecordType, story.Id);
        await StoryAnswers.SaveAsync(db, story, cancellationToken).ConfigureAwait(false);
        return StoryAnswers.Of(story, now);
    }
}

internal sealed class ScheduleStoryHandler(IAppDbContext db, TimeProvider time, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<ScheduleStoryCommand, AdminStoryDto>
{
    public async Task<AdminStoryDto> Handle(ScheduleStoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var now = time.GetUtcNow();
        var story = await StoryActions.FindAsync(db, request.Id, request.Version, now, cancellationToken).ConfigureAwait(false);
        if (story.Status is not (StoryStatus.Draft or StoryStatus.InReview))
        {
            throw StoryAnswers.StatusConflict();
        }

        StoryActions.Change(() => story.Edit(request.ToContent(), now));
        story.SetSlug(await StoryActions.SlugOfAsync(db, story, cancellationToken).ConfigureAwait(false));
        StoryActions.Change(() => story.Schedule(request.PublishAt()!.Value, current.Id, now));
        audit.Record(current.Id, StoryActions.RecordType, story.Id);
        await StoryAnswers.SaveAsync(db, story, cancellationToken).ConfigureAwait(false);
        return StoryAnswers.Of(story, now);
    }
}

internal sealed class UnscheduleStoryHandler(IAppDbContext db, TimeProvider time, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<UnscheduleStoryCommand, AdminStoryDto>
{
    public async Task<AdminStoryDto> Handle(UnscheduleStoryCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var now = time.GetUtcNow();
        var story = await StoryActions.FindAsync(db, request.Id, request.Version, now, cancellationToken).ConfigureAwait(false);
        StoryActions.Change(() => story.Unschedule(now));
        audit.Record(current.Id, StoryActions.RecordType, story.Id);
        await StoryAnswers.SaveAsync(db, story, cancellationToken).ConfigureAwait(false);
        return StoryAnswers.Of(story, now);
    }
}
