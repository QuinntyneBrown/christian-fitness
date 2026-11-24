using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Services;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Services;

/// <summary>What deciding an application answers: the application, how it ended and, if approved, its listing (ADR 0049).</summary>
public sealed record ApplicationDecisionDto(Guid ApplicationId, string Status, Guid? ListingId);

/// <summary>
/// Approves the Pending application <see cref="ApplicationId"/> and publishes its listing (L2-025 AC2;
/// ADR 0049). Audited as <c>application.approved</c> (L2-019 AC3).
/// </summary>
public sealed record ApproveApplicationCommand(Guid ApplicationId) : IRequest<ApplicationDecisionDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "application.approved";
}

/// <summary>
/// Declines the Pending application <see cref="ApplicationId"/> with a reason (L2-025 AC3; ADR 0049). A
/// class, not a record, so no generated <c>ToString</c> can print the reason. Audited as
/// <c>application.declined</c>; the entry keeps no reason.
/// </summary>
public sealed class DeclineApplicationCommand(Guid applicationId, string? reason) : IRequest<ApplicationDecisionDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "application.declined";

    public Guid ApplicationId { get; } = applicationId;

    public string? Reason { get; } = reason;
}

/// <summary>The decline reason's codes, named in the refusal's <c>fieldCodes</c> (ADR 0049); the sentences never repeat the reason.</summary>
public static class DecideApplicationRules
{
    public const string ReasonRequired = "reason_required";
    public const string ReasonTooLong = "reason_too_long";

    public static readonly IReadOnlySet<string> FieldCodes =
        new HashSet<string>(StringComparer.Ordinal) { ReasonRequired, ReasonTooLong };
}

internal sealed class DeclineApplicationValidator : AbstractValidator<DeclineApplicationCommand>
{
    public DeclineApplicationValidator() =>
        RuleFor(c => c.Reason)
            .Cascade(CascadeMode.Stop)
            .Must(reason => !string.IsNullOrWhiteSpace(reason)).WithErrorCode(DecideApplicationRules.ReasonRequired).WithMessage("Write a reason for declining")
            .Must(reason => reason!.Trim().Length <= ProfessionalApplication.DeclineReasonMaxLength)
            .WithErrorCode(DecideApplicationRules.ReasonTooLong).WithMessage("Use 500 characters or fewer");
}

/// <summary>Loads the application to decide, or refuses 404 <c>application_not_found</c>.</summary>
internal static class ApplicationLookup
{
    public const string RecordType = "ProfessionalApplication";

    public static async Task<ProfessionalApplication> FindAsync(IAppDbContext db, Guid id, CancellationToken cancellationToken) =>
        await db.ProfessionalApplications.SingleOrDefaultAsync(a => a.Id == id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.ApplicationNotFound, RefusalKind.NotFound);

    public static RefusalException Decided() => new(RefusalCodes.ApplicationDecided, RefusalKind.Conflict);
}

/// <summary>Approves and publishes in one unit of work; logs nothing (L2-033).</summary>
internal sealed class ApproveApplicationHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit, TimeProvider time)
    : IRequestHandler<ApproveApplicationCommand, ApplicationDecisionDto>
{
    public async Task<ApplicationDecisionDto> Handle(ApproveApplicationCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var application = await ApplicationLookup.FindAsync(db, request.ApplicationId, cancellationToken).ConfigureAwait(false);
        var name = await db.Members.AsNoTracking().Where(m => m.Id == application.MemberId).Select(m => m.Name).SingleAsync(cancellationToken).ConfigureAwait(false);
        if (!application.TryApprove(name, time.GetUtcNow(), out var listing))
        {
            throw ApplicationLookup.Decided();
        }

        db.ServiceListings.Add(listing!);
        audit.Record(current.Id, ApplicationLookup.RecordType, application.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new ApplicationDecisionDto(application.Id, "approved", listing!.Id);
    }
}

/// <summary>Declines and records the reason; creates no listing; logs nothing (L2-033).</summary>
internal sealed class DeclineApplicationHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit, TimeProvider time)
    : IRequestHandler<DeclineApplicationCommand, ApplicationDecisionDto>
{
    public async Task<ApplicationDecisionDto> Handle(DeclineApplicationCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var application = await ApplicationLookup.FindAsync(db, request.ApplicationId, cancellationToken).ConfigureAwait(false);
        if (!application.TryDecline(request.Reason ?? string.Empty, time.GetUtcNow()))
        {
            throw ApplicationLookup.Decided();
        }

        audit.Record(current.Id, ApplicationLookup.RecordType, application.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new ApplicationDecisionDto(application.Id, "declined", null);
    }
}
