using ChristianFitness.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Members;

/// <summary>
/// The staff list of members, one page of it (L2-028; ADR 0022). A class, not a record, so no
/// generated <c>ToString</c> can print what staff searched for.
/// </summary>
public sealed class SearchMembersQuery(int? page) : IRequest<MemberListDto>
{
    /// <summary>How many members one page holds (L2-028 AC1).</summary>
    public const int PageSize = 25;

    /// <summary>The page asked for, from 1; none is the first.</summary>
    public int? Page { get; } = page;
}

/// <summary>
/// Reads one page of members, newest joined first and then by id, so the order holds from page to
/// page; a page past the last answers the last. Events attended come from
/// <see cref="IRegistrationReader"/>, asked once for the page. It logs nothing: the email and the
/// home church are never in a log or span (L2-033 AC2).
/// </summary>
internal sealed class SearchMembersHandler(IAppDbContext db, IRegistrationReader registrations)
    : IRequestHandler<SearchMembersQuery, MemberListDto>
{
    public async Task<MemberListDto> Handle(SearchMembersQuery request, CancellationToken cancellationToken)
    {
        var total = await db.Members.CountAsync(cancellationToken).ConfigureAwait(false);
        var members = db.Members.AsNoTracking();
        var matches = total;

        var lastPage = Math.Max(1, (matches + SearchMembersQuery.PageSize - 1) / SearchMembersQuery.PageSize);
        var page = Math.Min(request.Page ?? 1, lastPage);
        var rows = await members
            .OrderByDescending(m => m.JoinedAt)
            .ThenByDescending(m => m.Id)
            .Skip((page - 1) * SearchMembersQuery.PageSize)
            .Take(SearchMembersQuery.PageSize)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var attended = await registrations.CountsForAsync([.. rows.Select(m => m.Id)], cancellationToken).ConfigureAwait(false);

        return new MemberListDto(
            total,
            matches,
            page,
            SearchMembersQuery.PageSize,
            [.. rows.Select(m => new MemberRowDto(
                m.Id, m.Name, m.Email, m.HomeChurch, m.JoinedAt, attended.GetValueOrDefault(m.Id), MemberStatusNames.Of(m.Status)))]);
    }
}
