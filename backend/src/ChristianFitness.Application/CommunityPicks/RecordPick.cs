using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Domain.Events;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.CommunityPicks;

/// <summary>
/// Records that the signed-in staff member made <see cref="EventId"/> a Community Pick with
/// <see cref="Note"/> (L2-072 AC13; ADR 0098). Audited as <c>community_pick.recorded</c>. The note
/// is the staff member's own text: it is stored, never logged.
/// </summary>
public sealed record RecordPickCommand(Guid EventId, string? Note) : IRequest<RecordedPickDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "community_pick.recorded";
}

/// <summary>The pick recorded: its event and when.</summary>
public sealed record RecordedPickDto(Guid EventId, DateTimeOffset PickedAt);

/// <summary>The field codes a refused pick names (ADR 0098).</summary>
public static class CommunityPickRules
{
    public const string NoteTooLong = "note_too_long";

    /// <summary>The codes a client finds in <c>fieldCodes</c>; the answer's own code is <c>field_too_long</c>.</summary>
    public static readonly IReadOnlySet<string> FieldCodes = new HashSet<string>(StringComparer.Ordinal) { NoteTooLong };
}

/// <summary>A note is at most 70 characters once trimmed, and may be empty; the sentence never repeats it.</summary>
internal sealed class RecordPickValidator : AbstractValidator<RecordPickCommand>
{
    public RecordPickValidator()
    {
        // Two failures with one sentence: the top-level code field_too_long and the field's own
        // note_too_long in fieldCodes (ADR 0098); a moderation note keeps validation_failed.
        RuleFor(c => c.Note)
            .Must(FitsTheLimit)
            .WithErrorCode(RefusalCodes.FieldTooLong)
            .WithMessage(TooLong)
            .Must(FitsTheLimit)
            .WithErrorCode(CommunityPickRules.NoteTooLong)
            .WithMessage(TooLong);
    }

    private const string TooLong = "Use 70 characters or fewer";

    private static bool FitsTheLimit(string? note) => (note ?? string.Empty).Trim().Length <= CommunityPick.NoteMaxLength;
}

internal sealed class RecordPickHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit, TimeProvider time)
    : IRequestHandler<RecordPickCommand, RecordedPickDto>
{
    public async Task<RecordedPickDto> Handle(RecordPickCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var now = time.GetUtcNow();
        var picked = await db.Events
            .Where(e => e.Id == request.EventId)
            .Select(e => new { e.Status, e.StartsAt })
            .SingleOrDefaultAsync(cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.EventNotFound, RefusalKind.NotFound);
        if (picked.Status != EventStatus.Published || picked.StartsAt <= now)
        {
            throw new RefusalException(RefusalCodes.EventNotPublished, RefusalKind.Conflict);
        }

        var pick = CommunityPick.Record(request.EventId, request.Note ?? string.Empty, current.Id, now);
        db.CommunityPicks.Add(pick);
        audit.Record(current.Id, nameof(CommunityPick), pick.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new RecordedPickDto(pick.EventId, pick.PickedAt);
    }
}
