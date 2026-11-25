using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Members;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Members;

/// <summary>
/// The staff list of members, one page of it (L2-028; ADR 0022). A class, not a record, so no
/// generated <c>ToString</c> can print what staff searched for.
/// </summary>
public sealed class SearchMembersQuery(string? search, string? status, int? page) : IRequest<MemberListDto>
{
    /// <summary>How many members one page holds (L2-028 AC1).</summary>
    public const int PageSize = 25;

    /// <summary>The longest search the list answers, once trimmed (L2-028 AC6).</summary>
    public const int SearchMaxLength = 100;

    /// <summary>What a name or an email must contain, in any case; none or blank keeps everyone.</summary>
    public string? Search { get; } = search;

    /// <summary><c>all</c> (the default), <c>active</c>, <c>flagged</c> or <c>suspended</c>.</summary>
    public string? Status { get; } = status;

    /// <summary>The page asked for, from 1; none is the first.</summary>
    public int? Page { get; } = page;
}

/// <summary>
/// What the list cannot answer is refused with 400 <c>validation_failed</c> (L2-028 AC6). The
/// messages name the rule, never what was searched for.
/// </summary>
internal sealed class SearchMembersValidator : AbstractValidator<SearchMembersQuery>
{
    public const string UnknownStatus = "Choose all, active, flagged or suspended";
    public const string SearchTooLong = "Search with 100 characters or fewer";
    public const string PageTooLow = "Pages start at 1";

    public SearchMembersValidator()
    {
        RuleFor(q => q.Status)
            .Must(status => status is null or "all" || MemberStatusNames.StatusOf(status) is not null)
            .WithMessage(UnknownStatus);
        RuleFor(q => q.Search)
            .Must(search => search is null || search.Trim().Length <= SearchMembersQuery.SearchMaxLength)
            .WithMessage(SearchTooLong);
        RuleFor(q => q.Page)
            .Must(page => page is null or >= 1)
            .WithMessage(PageTooLow);
    }
}

/// <summary>
/// Keeps the members whose name or email contains the trimmed search, in any case, and whose
/// status is the one asked for; never the home church. The term reaches the database as a value,
/// so <c>%</c> and <c>_</c> are ordinary characters. Then it reads one page, newest joined first
/// and then by id, so the order holds from page to page; a page past the last answers the last.
/// Events attended come from
/// <see cref="IRegistrationReader"/>, asked once for the page. It logs nothing: the email and the
/// home church are never in a log or span (L2-033 AC2).
/// </summary>
internal sealed class SearchMembersHandler(IAppDbContext db, IRegistrationReader registrations)
    : IRequestHandler<SearchMembersQuery, MemberListDto>
{
    public async Task<MemberListDto> Handle(SearchMembersQuery request, CancellationToken cancellationToken)
    {
        // The Christian Fitness account is not a person: it is never listed or counted (ADR 0065).
        var people = db.Members.AsNoTracking().Where(m => !m.IsSystem);
        var total = await people.CountAsync(cancellationToken).ConfigureAwait(false);
        var members = people;
        if (MemberStatusNames.StatusOf(request.Status) is { } status)
        {
            members = members.Where(m => m.Status == status);
        }

        var term = Member.NormalizeEmail(request.Search ?? string.Empty);
        if (term.Length > 0)
        {
#pragma warning disable CA1304, CA1311, CA1862 // Translated by EF Core to the database's lower(); no culture is involved.
            members = members.Where(m => m.Name.ToLower().Contains(term) || m.NormalizedEmail.Contains(term));
#pragma warning restore CA1304, CA1311, CA1862
        }

        var matches = await members.CountAsync(cancellationToken).ConfigureAwait(false);

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
            [.. rows.Select(m => MemberRowDto.Of(m, attended.GetValueOrDefault(m.Id)))]);
    }
}
