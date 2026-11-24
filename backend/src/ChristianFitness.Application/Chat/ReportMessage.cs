using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Chat;

/// <summary>
/// A member reports the message <see cref="MessageId"/>, a group or a direct one, with an optional
/// reason (L2-017; ADR 0000). A class, not a record, so no generated <c>ToString</c> can print the reason.
/// </summary>
public sealed class ReportMessageCommand(Guid messageId, string? reason) : IRequest
{
    public Guid MessageId { get; } = messageId;

    public string? Reason { get; } = reason;
}

/// <summary>A reason is at most 500 characters (L2-017 AC3); the sentence is fixed and never repeats it.</summary>
internal sealed class ReportMessageValidator : AbstractValidator<ReportMessageCommand>
{
    public ReportMessageValidator() =>
        RuleFor(c => c.Reason)
            .Must(reason => reason is null || reason.Trim().Length <= MessageReport.ReasonMaxLength)
            .WithErrorCode(RefusalCodes.FieldTooLong)
            .WithMessage("Use 500 characters or fewer");
}

/// <summary>
/// Records the report and flags the sender (L2-017; ADR 0058). The message is looked for among the
/// caller's group chats (a registration is the membership, ADR 0041) and among the direct messages they
/// sent or received; anything else, even a real message, is <c>message_not_found</c>. Their own is
/// <c>cannot_report_own_message</c>; a second report of one message is <c>already_reported</c>. Only an
/// Active sender is flagged, by the rule slice 27.1 wrote. The reason is stored and never logged.
/// </summary>
internal sealed class ReportMessageHandler(IAppDbContext db, ICurrentMember current, TimeProvider time) : IRequestHandler<ReportMessageCommand>
{
    /// <summary>What staff read on a flagged member's row when a report flagged them.</summary>
    public const string FlagNote = "Reported by a member";

    public async Task Handle(ReportMessageCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var reporter = current.Id;
        var senderId = await SenderOfAsync(request.MessageId, reporter, cancellationToken).ConfigureAwait(false);
        if (senderId == reporter)
        {
            throw new RefusalException(RefusalCodes.CannotReportOwnMessage, RefusalKind.Forbidden);
        }

        if (await db.MessageReports.AnyAsync(r => r.ReporterId == reporter && r.MessageId == request.MessageId, cancellationToken).ConfigureAwait(false))
        {
            throw AlreadyReported();
        }

        var report = MessageReport.Of(request.MessageId, reporter, senderId, request.Reason, time.GetUtcNow());
        db.MessageReports.Add(report);
        var sender = await db.Members.SingleOrDefaultAsync(m => m.Id == senderId, cancellationToken).ConfigureAwait(false);
        sender?.TryFlag(FlagNote);
        try
        {
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (DbUpdateException exception)
        {
            // Two identical reports at one moment both pass the lookup; the unique index refuses the second.
            db.MessageReports.Remove(report);
            if (await db.MessageReports.AnyAsync(r => r.ReporterId == reporter && r.MessageId == request.MessageId, cancellationToken).ConfigureAwait(false))
            {
                throw new RefusalException(RefusalCodes.AlreadyReported, RefusalKind.Conflict, exception);
            }

            throw;
        }
    }

    private static RefusalException AlreadyReported() => new(RefusalCodes.AlreadyReported, RefusalKind.Conflict);

    /// <summary>The author of the message when the caller can read it, else <c>message_not_found</c>.</summary>
    private async Task<Guid> SenderOfAsync(Guid messageId, Guid reporter, CancellationToken cancellationToken)
    {
        var group = await db.ChatMessages.AsNoTracking()
            .Where(m => m.Id == messageId)
            .Select(m => new { m.AuthorId, m.EventId })
            .SingleOrDefaultAsync(cancellationToken).ConfigureAwait(false);
        if (group is not null)
        {
            var seat = await ChatMembership.SeatAsync(db, group.EventId, reporter, cancellationToken).ConfigureAwait(false);
            return seat is null ? throw NotFound() : group.AuthorId;
        }

        var direct = await db.DirectMessages.AsNoTracking()
            .Where(m => m.Id == messageId && (m.SenderId == reporter || m.RecipientId == reporter))
            .Select(m => (Guid?)m.SenderId)
            .SingleOrDefaultAsync(cancellationToken).ConfigureAwait(false);
        return direct ?? throw NotFound();
    }

    private static RefusalException NotFound() => new(RefusalCodes.MessageNotFound, RefusalKind.NotFound);
}
