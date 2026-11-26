using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Newsletter;
using ChristianFitness.Domain.News;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Newsletter;

/// <summary>
/// "Schedule issue" (L2-070 AC5, AC6): saves the fields sent and locks the issue to go out at its
/// time. An empty subject, no big story or an empty editor's note, or a story or event no longer
/// published, is 400 <c>validation_failed</c> naming the field. Audited <c>newsletter_issue.scheduled</c>.
/// </summary>
public sealed class ScheduleIssueCommand : IssueFields, IRequest<NextIssueDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "newsletter_issue.scheduled";
}

/// <summary>
/// "Unschedule to edit" (L2-070 AC6): a Scheduled issue is a Draft again; one not Scheduled, or
/// already sending, is 409 <c>status_conflict</c>. Audited <c>newsletter_issue.unscheduled</c>.
/// </summary>
public sealed record UnscheduleIssueCommand(int Number) : IRequest<NextIssueDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "newsletter_issue.unscheduled";
}

internal sealed class ScheduleIssueValidator : IssueFieldsValidator<ScheduleIssueCommand>
{
    public ScheduleIssueValidator(IAppDbContext db, TimeProvider time)
    {
        RuleFor(c => c.Subject).Must(text => !string.IsNullOrWhiteSpace(text)).WithErrorCode("subject_required").WithMessage("Add a subject line before scheduling.");
        RuleFor(c => c.EditorsNote).Must(text => !string.IsNullOrWhiteSpace(text)).WithErrorCode("editors_note_required").WithMessage("Add an editor's note before scheduling.");
        RuleFor(c => c.LeadStoryId)
            .NotNull().WithErrorCode("lead_story_required").WithMessage("Choose the big story before scheduling.")
            .MustAsync((id, cancellationToken) => PublishedAsync(db, [id!.Value], cancellationToken))
            .WithErrorCode(IssueRules.StoryUnavailable).WithMessage("Choose a published story");
        RuleFor(c => c.AlsoStoryIds)
            .MustAsync((ids, cancellationToken) => PublishedAsync(db, [.. (ids ?? []).Distinct()], cancellationToken))
            .WithErrorCode(IssueRules.StoryUnavailable).WithMessage("Choose published stories");
        RuleFor(c => c.EventIds)
            .MustAsync(async (ids, cancellationToken) =>
            {
                var wanted = (ids ?? []).Distinct().ToList();
                var now = time.GetUtcNow();
                return wanted.Count == await db.Events
                    .CountAsync(e => wanted.Contains(e.Id) && e.Status == EventStatus.Published && e.StartsAt > now, cancellationToken).ConfigureAwait(false);
            })
            .WithErrorCode(IssueRules.EventUnavailable).WithMessage("Choose published events to come");
    }

    private static async Task<bool> PublishedAsync(IAppDbContext db, List<Guid> ids, CancellationToken cancellationToken) =>
        ids.Count == await db.Stories.CountAsync(s => ids.Contains(s.Id) && s.Status == StoryStatus.Published, cancellationToken).ConfigureAwait(false);
}

internal sealed class ScheduleIssueHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<ScheduleIssueCommand, NextIssueDto>
{
    public async Task<NextIssueDto> Handle(ScheduleIssueCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var issue = await Issues.FindDraftAsync(db, request.Number, cancellationToken).ConfigureAwait(false);
        issue.Write(request.ToContent());
        issue.Schedule(current.Id);
        audit.Record(current.Id, nameof(NewsletterIssue), issue.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return NextIssueDto.Of(issue);
    }
}

internal sealed class UnscheduleIssueHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<UnscheduleIssueCommand, NextIssueDto>
{
    public async Task<NextIssueDto> Handle(UnscheduleIssueCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var issue = await Issues.FindAsync(db, request.Number, cancellationToken).ConfigureAwait(false);
        if (!issue.CanUnschedule)
        {
            throw new RefusalException(RefusalCodes.StatusConflict, RefusalKind.Conflict);
        }

        issue.Unschedule();
        audit.Record(current.Id, nameof(NewsletterIssue), issue.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return NextIssueDto.Of(issue);
    }
}
