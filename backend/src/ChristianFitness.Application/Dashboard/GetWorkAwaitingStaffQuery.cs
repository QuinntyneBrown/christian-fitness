using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Admin;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Dashboard;

/// <summary>One pending application as the Dashboard names it: who, the role they apply for and when (ADR 0059).</summary>
public sealed record AwaitingApplicationDto(Guid Id, string Name, string Role, DateTimeOffset SubmittedAt);

/// <summary>One flagged member as the Dashboard names it: who and staff's own note, as the Members screen shows them (ADR 0059).</summary>
public sealed record AwaitingFlaggedMemberDto(Guid Id, string Name, string? Note);

/// <summary>How many wait in all and the oldest few of them.</summary>
public sealed record AwaitingListDto<T>(int Total, IReadOnlyList<T> Items);

/// <summary>The work waiting for the caller; <see cref="Applications"/> is omitted for a Moderator (ADR 0059).</summary>
public sealed record WorkAwaitingStaffDto(
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    AwaitingListDto<AwaitingApplicationDto>? Applications,
    AwaitingListDto<AwaitingFlaggedMemberDto> FlaggedMembers);

/// <summary>Staff ask what is waiting for them (L2-020 AC7 to AC10; ADR 0059).</summary>
public sealed record GetWorkAwaitingStaffQuery : IRequest<WorkAwaitingStaffDto>;

/// <summary>
/// Counts the Pending applications and the Flagged members and names the oldest <see cref="Shown"/> of each: applications by
/// submitted time, members by join time (no flag time is kept). A Moderator's answer has no applications, so none is read
/// for them (ADR 0059). Name, role and the staff note are what the Services and Members screens already show their role.
/// </summary>
internal sealed class GetWorkAwaitingStaffHandler(IAppDbContext db, ICurrentMember current) : IRequestHandler<GetWorkAwaitingStaffQuery, WorkAwaitingStaffDto>
{
    public const int Shown = 3;

    public async Task<WorkAwaitingStaffDto> Handle(GetWorkAwaitingStaffQuery request, CancellationToken cancellationToken)
    {
        var role = await StaffRoles.OfAsync(db, current.Id, cancellationToken).ConfigureAwait(false);
        var flagged = db.Members.AsNoTracking().Where(m => m.Status == MemberStatus.Flagged);
        var flaggedTotal = await flagged.CountAsync(cancellationToken).ConfigureAwait(false);
        var flaggedRows = await flagged
            .OrderBy(m => m.JoinedAt).ThenBy(m => m.Id)
            .Take(Shown)
            .Select(m => new { m.Id, m.Name, m.ModerationNote })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var members = new AwaitingListDto<AwaitingFlaggedMemberDto>(flaggedTotal, [.. flaggedRows.Select(m => new AwaitingFlaggedMemberDto(m.Id, m.Name, m.ModerationNote))]);
        if (role != StaffRoleName.Admin)
        {
            return new WorkAwaitingStaffDto(null, members);
        }

        var pending = db.ProfessionalApplications.AsNoTracking().Where(a => a.Status == ApplicationStatus.Pending);
        var total = await pending.CountAsync(cancellationToken).ConfigureAwait(false);
        var rows = await pending
            .Join(db.Members, a => a.MemberId, m => m.Id, (a, m) => new { a.Id, m.Name, a.Role, a.SubmittedAt })
            .OrderBy(a => a.SubmittedAt).ThenBy(a => a.Id)
            .Take(Shown)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return new WorkAwaitingStaffDto(
            new AwaitingListDto<AwaitingApplicationDto>(total, [.. rows.Select(a => new AwaitingApplicationDto(a.Id, a.Name, a.Role, a.SubmittedAt))]),
            members);
    }
}
