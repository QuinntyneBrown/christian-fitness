using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Services;

/// <summary>One Pending application as staff read it: who, the role, the credentials and when it was sent (L2-025 AC1; ADR 0048).</summary>
public sealed record PendingApplicationDto(Guid Id, string Name, string Role, string Credentials, DateTimeOffset SubmittedAt);

/// <summary>The oldest Pending applications and how many are waiting in all (L2-025 AC1, AC4; ADR 0048).</summary>
public sealed record PendingApplicationsDto(int Total, IReadOnlyList<PendingApplicationDto> Applications);

/// <summary>Lists the Pending applications, oldest first, at most <see cref="Limit"/>.</summary>
public sealed record ListPendingApplicationsQuery : IRequest<PendingApplicationsDto>
{
    /// <summary>The most applications one answer holds; <see cref="PendingApplicationsDto.Total"/> still counts every one (ADR 0048).</summary>
    public const int Limit = 50;
}

internal sealed class ListPendingApplicationsHandler(IAppDbContext db) : IRequestHandler<ListPendingApplicationsQuery, PendingApplicationsDto>
{
    public async Task<PendingApplicationsDto> Handle(ListPendingApplicationsQuery request, CancellationToken cancellationToken)
    {
        var pending = db.ProfessionalApplications.AsNoTracking().Where(a => a.Status == ApplicationStatus.Pending);
        var total = await pending.CountAsync(cancellationToken).ConfigureAwait(false);
        var rows = await pending
            .Join(db.Members, a => a.MemberId, m => m.Id, (a, m) => new { a.Id, m.Name, a.Role, a.Credentials, a.SubmittedAt })
            .OrderBy(a => a.SubmittedAt)
            .ThenBy(a => a.Id)
            .Take(ListPendingApplicationsQuery.Limit)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return new PendingApplicationsDto(total, [.. rows.Select(r => new PendingApplicationDto(r.Id, r.Name, r.Role, r.Credentials, r.SubmittedAt))]);
    }
}
