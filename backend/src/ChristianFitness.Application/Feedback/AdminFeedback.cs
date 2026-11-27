using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Chat;
using ChristianFitness.Application.Email;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Feedback;
using ChristianFitness.Domain.Members;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Feedback;

/// <summary>The inbox's names for kinds and statuses, the same codes as the form (L2-074 AC1).</summary>
internal static class FeedbackNames
{
#pragma warning disable CA1308 // Wire names, not comparisons.
    public static string Of(FeedbackKind kind) => kind.ToString().ToLowerInvariant();

    public static string Of(FeedbackStatus status) => status.ToString().ToLowerInvariant();
#pragma warning restore CA1308

    public static FeedbackStatus? StatusOf(string? name) => name switch
    {
        "new" => FeedbackStatus.New,
        "replied" => FeedbackStatus.Replied,
        "resolved" => FeedbackStatus.Resolved,
        _ => null,
    };
}

/// <summary>
/// The inbox (L2-074 AC1, AC2): the notes of <paramref name="Status"/> (<c>new</c>,
/// <c>replied</c>, <c>resolved</c>; anything else is every note), newest first, at most
/// <see cref="Limit"/>, and how many each tab holds.
/// </summary>
public sealed record ListFeedbackQuery(string? Status) : IRequest<FeedbackListDto>
{
    /// <summary>The most notes one answer holds, so the list stays bounded.</summary>
    public const int Limit = 100;

    /// <summary>How much of a note's text its row shows.</summary>
    public const int ExcerptLength = 120;
}

public sealed record FeedbackListDto(FeedbackCountsDto Counts, IReadOnlyList<FeedbackRowDto> Items);

public sealed record FeedbackCountsDto(int All, int New, int Replied, int Resolved);

/// <summary>One note as its row reads: its kind, who sent it, when, the start of its text and its status.</summary>
public sealed record FeedbackRowDto(Guid Id, string Kind, string Sender, DateTimeOffset SentAt, string Excerpt, string Status);

/// <summary>One note in full (L2-074 AC3); an unknown id is 404 <c>not_found</c>.</summary>
public sealed record GetFeedbackNoteQuery(Guid Id) : IRequest<FeedbackNoteDto>;

public sealed record FeedbackNoteDto(
    Guid Id,
    string Kind,
    string Status,
    DateTimeOffset SentAt,
    string Text,
    FeedbackSenderDto Sender,
    FeedbackPageDto Page,
    Guid? StoryId,
    string Device,
    string Browser,
    bool HasScreenshot,
    bool MayEmail,
    IReadOnlyList<FeedbackReplyDto> Replies);

public sealed record FeedbackSenderDto(string Name, string Email, bool Suspended);

public sealed record FeedbackPageDto(string? RouteTemplate, string? Title);

/// <summary>A reply kept with the note: its text, when, and the staff member who wrote it.</summary>
public sealed record FeedbackReplyDto(string Text, DateTimeOffset SentAt, string By);

/// <summary>A note's screenshot, for a staff session only (L2-074 AC8); none is 404 <c>not_found</c>.</summary>
public sealed record GetFeedbackScreenshotQuery(Guid Id) : IRequest<StoredImage>;

/// <summary>
/// Replies to a note (L2-074 AC5): by email when the member allowed it, else as a direct message
/// from Christian Fitness; the reply is kept with the note, which becomes Replied. A class, so its
/// text is never printed. Audited <c>feedback.replied</c>.
/// </summary>
public sealed class ReplyToFeedbackCommand : IRequest<FeedbackRepliedDto>, IAuditableCommand
{
    /// <summary>The note, from the route.</summary>
    public Guid Id { get; set; }

    public string? Text { get; set; }

    string IAuditableCommand.AuditAction => "feedback.replied";
}

/// <summary>What a reply answers: the note's status, how the reply went (<c>email</c> or <c>message</c>) and the reply kept.</summary>
public sealed record FeedbackRepliedDto(string Status, string DeliveredBy, FeedbackReplyDto Reply);

/// <summary>Mark resolved (L2-074 AC6); a note already Resolved is 409 <c>status_conflict</c>. Audited <c>feedback.resolved</c>.</summary>
public sealed record ResolveFeedbackCommand(Guid Id) : IRequest<FeedbackStatusDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "feedback.resolved";
}

/// <summary>Reopen (L2-074 AC6): a Resolved note is New again; any other is 409 <c>status_conflict</c>. Audited <c>feedback.reopened</c>.</summary>
public sealed record ReopenFeedbackCommand(Guid Id) : IRequest<FeedbackStatusDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "feedback.reopened";
}

public sealed record FeedbackStatusDto(string Status);

/// <summary>The field codes the inbox refuses with, named in <c>fieldCodes</c>.</summary>
public static class FeedbackReplyRules
{
    public static readonly IReadOnlySet<string> FieldCodes = new HashSet<string>(StringComparer.Ordinal) { "reply_required", "reply_too_long" };
}

internal sealed class ReplyToFeedbackValidator : AbstractValidator<ReplyToFeedbackCommand>
{
    public ReplyToFeedbackValidator()
    {
        RuleFor(c => c.Text).Cascade(CascadeMode.Stop)
            .Must(text => !string.IsNullOrWhiteSpace(text)).WithErrorCode("reply_required").WithMessage("Write a reply before sending.")
            .Must(text => text!.Trim().Length <= FeedbackReply.TextMaxLength).WithErrorCode("reply_too_long").WithMessage("Use 2,000 characters or fewer");
    }
}

internal sealed class ListFeedbackHandler(IAppDbContext db) : IRequestHandler<ListFeedbackQuery, FeedbackListDto>
{
    public async Task<FeedbackListDto> Handle(ListFeedbackQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var byStatus = await db.FeedbackNotes.AsNoTracking()
            .GroupBy(n => n.Status)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Key, g => g.Count, cancellationToken).ConfigureAwait(false);
        var notes = db.FeedbackNotes.AsNoTracking();
        if (FeedbackNames.StatusOf(request.Status) is { } status)
        {
            notes = notes.Where(n => n.Status == status);
        }

        var rows = await notes
            .OrderByDescending(n => n.SentAt).ThenByDescending(n => n.Id)
            .Take(ListFeedbackQuery.Limit)
            .Join(db.Members, n => n.MemberId, m => m.Id, (n, m) => new { n.Id, n.Kind, m.Name, n.SentAt, n.Text, n.Status })
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        return new FeedbackListDto(
            new FeedbackCountsDto(
                byStatus.Values.Sum(),
                byStatus.GetValueOrDefault(FeedbackStatus.New),
                byStatus.GetValueOrDefault(FeedbackStatus.Replied),
                byStatus.GetValueOrDefault(FeedbackStatus.Resolved)),
            [.. rows.OrderByDescending(r => r.SentAt).ThenByDescending(r => r.Id).Select(r => new FeedbackRowDto(
                r.Id,
                FeedbackNames.Of(r.Kind),
                r.Name,
                r.SentAt,
                r.Text.Length <= ListFeedbackQuery.ExcerptLength ? r.Text : r.Text[..ListFeedbackQuery.ExcerptLength],
                FeedbackNames.Of(r.Status)))]);
    }
}

internal static class FeedbackNotes
{
    public static async Task<FeedbackNote> FindAsync(IAppDbContext db, Guid id, CancellationToken cancellationToken) =>
        await db.FeedbackNotes.SingleOrDefaultAsync(n => n.Id == id, cancellationToken).ConfigureAwait(false)
        ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
}

internal sealed class GetFeedbackNoteHandler(IAppDbContext db) : IRequestHandler<GetFeedbackNoteQuery, FeedbackNoteDto>
{
    public async Task<FeedbackNoteDto> Handle(GetFeedbackNoteQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var note = await db.FeedbackNotes.AsNoTracking().SingleOrDefaultAsync(n => n.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        var sender = await db.Members.AsNoTracking()
            .Where(m => m.Id == note.MemberId)
            .Select(m => new FeedbackSenderDto(m.Name, m.Email, m.Status == MemberStatus.Suspended))
            .SingleAsync(cancellationToken).ConfigureAwait(false);
        var replies = await db.FeedbackReplies.AsNoTracking()
            .Where(r => r.NoteId == note.Id)
            .OrderBy(r => r.SentAt).ThenBy(r => r.Id)
            .Join(db.Members, r => r.StaffId, m => m.Id, (r, m) => new FeedbackReplyDto(r.Text, r.SentAt, m.Name))
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        return new FeedbackNoteDto(
            note.Id,
            FeedbackNames.Of(note.Kind),
            FeedbackNames.Of(note.Status),
            note.SentAt,
            note.Text,
            sender,
            new FeedbackPageDto(note.PageRouteTemplate, note.PageTitle),
            note.StoryId,
            note.Device,
            note.Browser,
            note.ScreenshotKey is not null,
            note.MayEmail,
            replies);
    }
}

internal sealed class GetFeedbackScreenshotHandler(IAppDbContext db, IFeedbackScreenshotStore screenshots) : IRequestHandler<GetFeedbackScreenshotQuery, StoredImage>
{
    public async Task<StoredImage> Handle(GetFeedbackScreenshotQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var key = await db.FeedbackNotes.AsNoTracking().Where(n => n.Id == request.Id).Select(n => n.ScreenshotKey)
            .SingleOrDefaultAsync(cancellationToken).ConfigureAwait(false);
        return (key is null ? null : await screenshots.OpenAsync(key, cancellationToken).ConfigureAwait(false))
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
    }
}

internal sealed class ReplyToFeedbackHandler(
    IAppDbContext db, ICurrentMember current, AuditTrail audit, IEmailSender email, SystemMessages messages, TimeProvider time)
    : IRequestHandler<ReplyToFeedbackCommand, FeedbackRepliedDto>
{
    public const string EmailSubject = "A reply to your feedback";

    /// <summary>What a direct-message reply starts with (ADR 0065).</summary>
    public const string MessageLead = "Reply to your feedback:";

    public async Task<FeedbackRepliedDto> Handle(ReplyToFeedbackCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var note = await FeedbackNotes.FindAsync(db, request.Id, cancellationToken).ConfigureAwait(false);
        var member = await db.Members.AsNoTracking()
            .Where(m => m.Id == note.MemberId)
            .Select(m => new { m.Email, m.Name, m.DeletionRequestedAt })
            .SingleAsync(cancellationToken).ConfigureAwait(false);
        if (member.DeletionRequestedAt is not null)
        {
            // Nobody is there to read it: nothing is sent or kept (L2-074 AC12; ADR 0118).
            throw new RefusalException(RefusalCodes.MemberDeleting, RefusalKind.Conflict);
        }

        var staff = await db.Members.AsNoTracking().Where(m => m.Id == current.Id).Select(m => m.Name).SingleAsync(cancellationToken).ConfigureAwait(false);
        var now = time.GetUtcNow();
        var reply = FeedbackReply.To(note.Id, current.Id, request.Text!, now);
        // A member who did not allow email hears by direct message; a suspended one gets none, so
        // the reply is refused rather than kept as if it had arrived (ADR 0113).
        if (!note.MayEmail && !await messages.AddAsync(note.MemberId, $"{MessageLead}\n{reply.Text}", cancellationToken).ConfigureAwait(false))
        {
            throw new RefusalException(RefusalCodes.MemberUnreachable, RefusalKind.Conflict);
        }

        db.FeedbackReplies.Add(reply);
        note.MarkReplied(now);
        audit.Record(current.Id, nameof(FeedbackNote), note.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        if (note.MayEmail)
        {
            var first = member.Name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            var text = $"""
                Hi {(string.IsNullOrEmpty(first) ? "there" : first)},

                Thank you for writing to {Organisation.Name}. Here is our reply:

                {reply.Text}

                This address is not read. To write back, use Send feedback in the app.
                """;
            await email.SendAsync(new EmailMessage(member.Email, EmailSubject, text), cancellationToken).ConfigureAwait(false);
        }
        else
        {
            await messages.PushAsync(cancellationToken).ConfigureAwait(false);
        }

        return new FeedbackRepliedDto(FeedbackNames.Of(note.Status), note.MayEmail ? "email" : "message", new FeedbackReplyDto(reply.Text, reply.SentAt, staff));
    }
}

internal sealed class ResolveFeedbackHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit, TimeProvider time)
    : IRequestHandler<ResolveFeedbackCommand, FeedbackStatusDto>
{
    public async Task<FeedbackStatusDto> Handle(ResolveFeedbackCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var note = await FeedbackNotes.FindAsync(db, request.Id, cancellationToken).ConfigureAwait(false);
        if (!note.CanResolve)
        {
            throw new RefusalException(RefusalCodes.StatusConflict, RefusalKind.Conflict);
        }

        note.Resolve(time.GetUtcNow());
        audit.Record(current.Id, nameof(FeedbackNote), note.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new FeedbackStatusDto(FeedbackNames.Of(note.Status));
    }
}

internal sealed class ReopenFeedbackHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<ReopenFeedbackCommand, FeedbackStatusDto>
{
    public async Task<FeedbackStatusDto> Handle(ReopenFeedbackCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var note = await FeedbackNotes.FindAsync(db, request.Id, cancellationToken).ConfigureAwait(false);
        if (note.CanResolve)
        {
            throw new RefusalException(RefusalCodes.StatusConflict, RefusalKind.Conflict);
        }

        note.Reopen();
        audit.Record(current.Id, nameof(FeedbackNote), note.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new FeedbackStatusDto(FeedbackNames.Of(note.Status));
    }
}
