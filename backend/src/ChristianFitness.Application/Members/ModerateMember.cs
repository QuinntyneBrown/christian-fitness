using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Admin;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Members;

/// <summary>
/// Flags the member <see cref="MemberId"/> with a note (L2-029 AC1; ADR 0023). A class, not a
/// record, so no generated <c>ToString</c> can print the note. Its audit entry is slice 29.2's.
/// </summary>
public sealed class FlagMemberCommand(Guid memberId, string? note) : IRequest<MemberRowDto>
{
    public Guid MemberId { get; } = memberId;

    public string? Note { get; } = note;
}

/// <summary>
/// Suspends the member <see cref="MemberId"/> with a note, once staff confirmed it (L2-029 AC2;
/// ADR 0023). A class, not a record, as <see cref="FlagMemberCommand"/> is.
/// </summary>
public sealed class SuspendMemberCommand(Guid memberId, string? note, bool? confirmed) : IRequest<MemberRowDto>
{
    public Guid MemberId { get; } = memberId;

    public string? Note { get; } = note;

    public bool? Confirmed { get; } = confirmed;
}

/// <summary>
/// Returns the Flagged or Suspended member <see cref="MemberId"/> to Active (L2-029 AC3; ADR 0024).
/// It carries nothing but the id: reinstating asks for no note.
/// </summary>
public sealed record ReinstateMemberCommand(Guid MemberId) : IRequest<MemberRowDto>;

/// <summary>
/// The codes a moderation's fields fail with (L2-029 AC5), named in the refusal's
/// <c>fieldCodes</c>, and the note's rule both commands share. The sentences are fixed and never
/// repeat the note.
/// </summary>
public static class ModerationRules
{
    public const string NoteRequired = "note_required";
    public const string NoteTooLong = "note_too_long";
    public const string ConfirmationRequired = "confirmation_required";

    /// <summary>Every code a moderation's field can fail with: these appear in <c>fieldCodes</c>.</summary>
    public static readonly IReadOnlySet<string> FieldCodes =
        new HashSet<string>(StringComparer.Ordinal) { NoteRequired, NoteTooLong, ConfirmationRequired };

    internal static void Note<T>(IRuleBuilderInitial<T, string?> rule) =>
        rule.Cascade(CascadeMode.Stop)
            .Must(note => !string.IsNullOrWhiteSpace(note)).WithErrorCode(NoteRequired).WithMessage("Write a note so other staff know why")
            .Must(note => note!.Trim().Length <= Member.ModerationNoteMaxLength).WithErrorCode(NoteTooLong).WithMessage("Use 500 characters or fewer");
}

internal sealed class FlagMemberValidator : AbstractValidator<FlagMemberCommand>
{
    public FlagMemberValidator() => ModerationRules.Note(RuleFor(c => c.Note));
}

internal sealed class SuspendMemberValidator : AbstractValidator<SuspendMemberCommand>
{
    public SuspendMemberValidator()
    {
        ModerationRules.Note(RuleFor(c => c.Note));
        RuleFor(c => c.Confirmed)
            .Must(confirmed => confirmed == true)
            .WithErrorCode(ModerationRules.ConfirmationRequired)
            .WithMessage("Confirm that the member should be suspended");
    }
}

/// <summary>
/// What every moderation checks before it changes a member (L2-029 AC4, AC6, AC7; ADR 0023), in
/// order: the id names a member, or 404 <c>member_not_found</c>; the member is not the caller, or
/// 403 <c>cannot_moderate_self</c>; a staff account is moderated only by an Admin, or 403
/// <c>forbidden_role</c>. It logs nothing.
/// </summary>
internal sealed class ModerationTarget(IAppDbContext db, ICurrentMember current, IRegistrationReader registrations)
{
    public async Task<Member> FindAsync(Guid memberId, CancellationToken cancellationToken)
    {
        var member = await db.Members.SingleOrDefaultAsync(m => m.Id == memberId, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.MemberNotFound, RefusalKind.NotFound);
        var caller = current.Id;
        if (member.Id == caller)
        {
            throw new RefusalException(RefusalCodes.CannotModerateSelf, RefusalKind.Forbidden);
        }

        var targetIsStaff = await StaffRoles.OfAsync(db, member.Id, cancellationToken).ConfigureAwait(false) is not null;
        if (targetIsStaff && await StaffRoles.OfAsync(db, caller, cancellationToken).ConfigureAwait(false) != StaffRoleName.Admin)
        {
            throw new RefusalException(RefusalCodes.ForbiddenRole, RefusalKind.Forbidden);
        }

        return member;
    }

    /// <summary>The refusal for a change the member's status does not allow (L2-029 AC6).</summary>
    public static RefusalException Conflict() => new(RefusalCodes.StatusConflict, RefusalKind.Conflict);

    /// <summary>The member as their row shows them now.</summary>
    public async Task<MemberRowDto> RowOfAsync(Member member, CancellationToken cancellationToken)
    {
        var attended = await registrations.CountsForAsync([member.Id], cancellationToken).ConfigureAwait(false);
        return MemberRowDto.Of(member, attended.GetValueOrDefault(member.Id));
    }
}

/// <summary>Flags an Active member; they keep every session (L2-029 AC1).</summary>
internal sealed class FlagMemberHandler(IAppDbContext db, ModerationTarget target) : IRequestHandler<FlagMemberCommand, MemberRowDto>
{
    public async Task<MemberRowDto> Handle(FlagMemberCommand request, CancellationToken cancellationToken)
    {
        var member = await target.FindAsync(request.MemberId, cancellationToken).ConfigureAwait(false);
        if (!member.TryFlag(request.Note ?? string.Empty))
        {
            throw ModerationTarget.Conflict();
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return await target.RowOfAsync(member, cancellationToken).ConfigureAwait(false);
    }
}

/// <summary>
/// Suspends an Active or Flagged member and, in the same save, ends every session they have in
/// either app and any admin sign-in still waiting for its code (L2-029 AC2; ADR 0023). Sign-in
/// then refuses them (L2-004 AC4).
/// </summary>
internal sealed class SuspendMemberHandler(IAppDbContext db, ModerationTarget target, ISessionRevocation sessions)
    : IRequestHandler<SuspendMemberCommand, MemberRowDto>
{
    public async Task<MemberRowDto> Handle(SuspendMemberCommand request, CancellationToken cancellationToken)
    {
        var member = await target.FindAsync(request.MemberId, cancellationToken).ConfigureAwait(false);
        if (!member.TrySuspend(request.Note ?? string.Empty))
        {
            throw ModerationTarget.Conflict();
        }

        await sessions.EndAllAsync(member.Id, cancellationToken).ConfigureAwait(false);
        var pending = await db.TwoStepChallenges.Where(c => c.MemberId == member.Id).ToListAsync(cancellationToken).ConfigureAwait(false);
        db.TwoStepChallenges.RemoveRange(pending);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return await target.RowOfAsync(member, cancellationToken).ConfigureAwait(false);
    }
}

/// <summary>
/// Returns a Flagged or Suspended member to Active and clears their note (L2-029 AC3; ADR 0024).
/// Nothing else is restored: the sessions a suspension ended stay ended, and the member signs in
/// again.
/// </summary>
internal sealed class ReinstateMemberHandler(IAppDbContext db, ModerationTarget target) : IRequestHandler<ReinstateMemberCommand, MemberRowDto>
{
    public async Task<MemberRowDto> Handle(ReinstateMemberCommand request, CancellationToken cancellationToken)
    {
        var member = await target.FindAsync(request.MemberId, cancellationToken).ConfigureAwait(false);
        if (!member.TryReinstate())
        {
            throw ModerationTarget.Conflict();
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return await target.RowOfAsync(member, cancellationToken).ConfigureAwait(false);
    }
}
