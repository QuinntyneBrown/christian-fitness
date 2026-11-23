using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Profiles;
using ChristianFitness.Application.Members;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Application.Tests.Members;

/// <summary>
/// L2-028 AC2, AC3 and AC6 (ADR 0022): who a search and a status keep, and what the list refuses,
/// one case per row. The cast is the seven members of the Members mock with the dates it shows;
/// newest joined first they are Kevin, Tyler, Jordan, Priya, Grace, Adaeze, Michael.
/// </summary>
public sealed class SearchMembersHandlerTests : IAsyncDisposable
{
    private const string Kevin = "Kevin Brooks";
    private const string Tyler = "Tyler Simmons";
    private const string Jordan = "Jordan Reid";
    private const string Priya = "Priya Nair";
    private const string Grace = "Grace Thompson";
    private const string Adaeze = "Adaeze Kalu";
    private const string Michael = "Michael Chen";

    private readonly ServiceProvider _services;

    public SearchMembersHandlerTests()
    {
        var store = $"search-members-{Guid.NewGuid():N}";
        _services = new ServiceCollection()
            .AddApplication()
            .AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(store))
            .AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>())
            .AddSingleton<IRegistrationReader, NoRegistrations>()
            .AddSingleton(TimeProvider.System)
            .BuildServiceProvider();
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Add(db, Grace, "grace.thompson@gmail.com", "Grace Fellowship, Scarborough", new(2026, 1, 12), MemberStatus.Active);
        Add(db, Michael, "mchen.runs@outlook.com", "Toronto Chinese Baptist", new(2025, 11, 3), MemberStatus.Active);
        Add(db, Priya, "priya.nair@gmail.com", "Hope Church Mississauga", new(2026, 2, 20), MemberStatus.Active);
        Add(db, Kevin, "KBrooks.Fit@gmail.com", null, new(2026, 4, 2), MemberStatus.Flagged);
        Add(db, Adaeze, "adaeze.k@yahoo.ca", "RCCG Jesus House", new(2025, 12, 8), MemberStatus.Active);
        Add(db, Jordan, "jreid@rogers.com", "The Meeting House", new(2026, 3, 15), MemberStatus.Active);
        Add(db, Tyler, "tsimmons22@gmail.com", null, new(2026, 3, 30), MemberStatus.Suspended);
        db.SaveChanges();
    }

    public static TheoryData<string, string?, string?, string[]> Cases() => new()
    {
        // why, search, status, the names answered in order
        { "nothing asked", null, null, [Kevin, Tyler, Jordan, Priya, Grace, Adaeze, Michael] },
        { "the All tab", null, "all", [Kevin, Tyler, Jordan, Priya, Grace, Adaeze, Michael] },
        { "a blank search", "", null, [Kevin, Tyler, Jordan, Priya, Grace, Adaeze, Michael] },
        { "a search of spaces", "   ", null, [Kevin, Tyler, Jordan, Priya, Grace, Adaeze, Michael] },
        { "a first name only the name has", "michael", null, [Michael] },
        { "a name in upper case", "PRIYA NAIR", null, [Priya] },
        { "a name with its space", "Adaeze Kalu", null, [Adaeze] },
        { "the middle of a name", "ord", null, [Jordan] },
        { "a term with spaces around it", "  tyler ", null, [Tyler] },
        { "part of an email only the email has", "runs@outlook", null, [Michael] },
        { "an email's domain in upper case", "ROGERS.COM", null, [Jordan] },
        { "a whole email", "adaeze.k@yahoo.ca", null, [Adaeze] },
        { "an email typed with capitals at Join, searched in lower case", "kbrooks.fit", null, [Kevin] },
        { "a term the name and the email share", "grace", null, [Grace] },
        { "a term several members share", "gmail", null, [Kevin, Tyler, Priya, Grace] },
        { "a term nobody has", "Jessica", null, [] },
        { "a home church is not searched", "Fellowship", null, [] },
        { "a percent sign is a character, not a wildcard", "%", null, [] },
        { "an underscore is a character, not a wildcard", "gr_ce", null, [] },
        { "Active", null, "active", [Jordan, Priya, Grace, Adaeze, Michael] },
        { "Flagged", null, "flagged", [Kevin] },
        { "Suspended", null, "suspended", [Tyler] },
        { "Active and a search", "gmail", "active", [Priya, Grace] },
        { "Suspended and a search", "gmail", "suspended", [Tyler] },
        { "a status and a search nobody passes", "grace", "flagged", [] },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public async Task Given_the_cast_When_members_are_searched_Then_those_who_match_come_newest_first(string why, string? search, string? status, string[] names)
    {
        var list = await SendAsync(new SearchMembersQuery(search, status, page: null));

        var answered = list.Members.Select(m => m.Name).ToArray();
        Assert.True(names.SequenceEqual(answered), $"{why}: {string.Join(", ", answered)}");
        Assert.Equal(names.Length, list.Matches);
        Assert.Equal(7, list.Total);
    }

    public static TheoryData<string, string?, string?, int?, bool> Questions() => new()
    {
        // why, search, status, page, whether it is answered
        { "nothing asked", null, null, null, true },
        { "status all", null, "all", null, true },
        { "status active", null, "active", null, true },
        { "status flagged", null, "flagged", null, true },
        { "status suspended", null, "suspended", null, true },
        { "status in title case", null, "Active", null, false },
        { "status blank", null, "", null, false },
        { "status the list does not have", null, "banned", null, false },
        { "page 1", null, null, 1, true },
        { "a page past the last", null, null, 99, true },
        { "page 0", null, null, 0, false },
        { "a page below 0", null, null, -1, false },
        { "a search of 100 characters", new string('g', 100), null, null, true },
        { "a search of 100 characters once trimmed", " " + new string('g', 100) + "  ", null, null, true },
        { "a search of 101 characters", new string('g', 101), null, null, false },
    };

    [Theory]
    [MemberData(nameof(Questions))]
    public async Task Given_a_question_When_it_is_asked_of_the_list_Then_only_one_the_list_can_answer_is_answered(string why, string? search, string? status, int? page, bool answered)
    {
        var query = new SearchMembersQuery(search, status, page);

        if (answered)
        {
            var list = await SendAsync(query);
            Assert.True(list.Page >= 1, why);
        }
        else
        {
            await Assert.ThrowsAsync<ValidationException>(() => SendAsync(query));
        }
    }

    public async ValueTask DisposeAsync() => await _services.DisposeAsync();

    private async Task<MemberListDto> SendAsync(SearchMembersQuery query)
    {
        using var scope = _services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<ISender>().Send(query, TestContext.Current.CancellationToken);
    }

    /// <summary>A member who joined at noon UTC on <paramref name="joined"/>; the status is set in the store until slice 27.1.</summary>
    private static void Add(AppDbContext db, string name, string email, string? homeChurch, DateOnly joined, MemberStatus status)
    {
        var member = Member.Join(name, email, "hash", new DateTimeOffset(joined, new TimeOnly(12, 0), TimeSpan.Zero), homeChurch);
        db.Members.Add(member);
        db.Entry(member).Property(m => m.Status).CurrentValue = status;
    }

    private sealed class NoRegistrations : IRegistrationReader
    {
        public Task<IReadOnlyList<UpcomingEventDto>> UpcomingForAsync(Guid memberId, DateTimeOffset now, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<UpcomingEventDto>>([]);

        public Task<IReadOnlyDictionary<Guid, int>> CountsForAsync(IReadOnlyCollection<Guid> memberIds, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyDictionary<Guid, int>>(new Dictionary<Guid, int>());
    }
}
