using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Admin;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.News;
using ChristianFitness.Domain.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Dashboard;

/// <summary>One pending application as the Dashboard names it: who, the role they apply for and when (ADR 0000).</summary>
public sealed record AwaitingApplicationDto(Guid Id, string Name, string Role, DateTimeOffset SubmittedAt);

/// <summary>One flagged member as the Dashboard names it: who and staff's own note, as the Members screen shows them (ADR 0060).</summary>
public sealed record AwaitingFlaggedMemberDto(Guid Id, string Name, string? Note);

/// <summary>One listing suggestion waiting for review, as the Dashboard names it (L2-020 AC11; ADR 0090).</summary>
public sealed record AwaitingSuggestionDto(Guid Id, string Name);

/// <summary>One story In review as the Dashboard names it: its headline, byline and when it was submitted (journey 22; ADR 0097).</summary>
public sealed record AwaitingStoryDto(Guid Id, string Headline, string? Author, DateTimeOffset SubmittedAt);

/// <summary>How many wait in all and the oldest few of them.</summary>
public sealed record AwaitingListDto<T>(int Total, IReadOnlyList<T> Items);

/// <summary>The work waiting for the caller; <see cref="Applications"/> is omitted for a Moderator (ADR 0060).</summary>
public sealed record WorkAwaitingStaffDto(
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    AwaitingListDto<AwaitingApplicationDto>? Applications,
    AwaitingListDto<AwaitingFlaggedMemberDto> FlaggedMembers,
    AwaitingListDto<AwaitingSuggestionDto> Suggestions,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    AwaitingListDto<AwaitingStoryDto>? Stories = null);

/// <summary>Staff ask what is waiting for them (L2-020 AC7 to AC10; ADR 0060).</summary>
public sealed record GetWorkAwaitingStaffQuery : IRequest<WorkAwaitingStaffDto>;

/// <summary>
/// Counts the Pending applications and the Flagged members and names the oldest <see cref="Shown"/> of each: applications by
/// submitted time, members by join time (no flag time is kept). A Moderator's answer has no applications, so none is read
/// for them (ADR 0060). Name, role and the staff note are what the Services and Members screens already show their role.
/// Both roles review listing suggestions, so both get the undecided ones, oldest submitted first (L2-020 AC11; ADR 0090).
/// Only Admins review stories, so only they get the stories In review, longest waiting first (ADR 0097).
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
        var waiting = db.ListingSuggestions.AsNoTracking().Where(s => s.Status == SuggestionStatus.Waiting);
        var suggestionTotal = await waiting.CountAsync(cancellationToken).ConfigureAwait(false);
        var suggestionRows = await waiting
            .OrderBy(s => s.SubmittedAt).ThenBy(s => s.Id)
            .Take(Shown)
            .Select(s => new AwaitingSuggestionDto(s.Id, s.Name))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var suggestions = new AwaitingListDto<AwaitingSuggestionDto>(suggestionTotal, suggestionRows);
        if (role != StaffRoleName.Admin)
        {
            return new WorkAwaitingStaffDto(null, members, suggestions);
        }

        var pending = db.ProfessionalApplications.AsNoTracking().Where(a => a.Status == ApplicationStatus.Pending);
        var total = await pending.CountAsync(cancellationToken).ConfigureAwait(false);
        var rows = await pending
            .Join(db.Members, a => a.MemberId, m => m.Id, (a, m) => new { a.Id, m.Name, a.Role, a.SubmittedAt })
            .OrderBy(a => a.SubmittedAt).ThenBy(a => a.Id)
            .Take(Shown)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var inReview = db.Stories.AsNoTracking().Where(s => s.Status == StoryStatus.InReview);
        var storyTotal = await inReview.CountAsync(cancellationToken).ConfigureAwait(false);
        var storyRows = await inReview
            .OrderBy(s => s.SubmittedAt).ThenBy(s => s.Id)
            .Take(Shown)
            .Select(s => new { s.Id, s.Headline, s.BylineId, s.SubmittedAt })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var bylineIds = storyRows.Where(s => s.BylineId is not null).Select(s => s.BylineId!.Value).ToList();
        var bylines = await db.Bylines.AsNoTracking()
            .Where(b => bylineIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, b => b.Name, cancellationToken)
            .ConfigureAwait(false);
        var stories = new AwaitingListDto<AwaitingStoryDto>(
            storyTotal,
            [.. storyRows.Select(s => new AwaitingStoryDto(s.Id, s.Headline, s.BylineId is { } b && bylines.TryGetValue(b, out var name) ? name : null, s.SubmittedAt ?? default))]);
        return new WorkAwaitingStaffDto(
            new AwaitingListDto<AwaitingApplicationDto>(total, [.. rows.Select(a => new AwaitingApplicationDto(a.Id, a.Name, a.Role, a.SubmittedAt))]),
            members,
            suggestions,
            stories);
    }
}
