using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Profiles;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Members;

/// <summary>
/// What the admin member tests need (ADR 0022): members who joined a minute apart, so "newest
/// first" has one answer; a status set in the store, since nothing flags or suspends before slice
/// 27.1; a signed-in staff member; and the list as the admin app asks for it.
/// </summary>
internal static class AdminMembers
{
    /// <summary>The mocks' today: Wednesday, April 15, 2026, 8:45 AM in Toronto (12:45 UTC).</summary>
    public static readonly DateTimeOffset Today = new(2026, 4, 15, 12, 45, 0, TimeSpan.Zero);

    /// <summary>
    /// Joins <paramref name="name"/> through the API a minute after whoever joined before, and
    /// answers their id.
    /// </summary>
    public static async Task<Guid> JoinAsync(AdminMembersFactory factory, HttpClient client, string name, string email, string? homeChurch)
    {
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        var body = new JoinTests.JoinBody(name, email, Staff.Password, homeChurch, []);
        using var response = await client.PostAsJsonAsync(new Uri("/api/account/join", UriKind.Relative), body, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var session = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return session.GetProperty("memberId").GetGuid();
    }

    /// <summary>
    /// Sets a member's status in the store, as slice 27.1's flag and suspend will: no endpoint
    /// changes a status yet (lessons learned, slice 3.2).
    /// </summary>
    public static async Task SetStatusAsync(AdminMembersFactory factory, Guid id, MemberStatus status)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var member = await db.Members.SingleAsync(m => m.Id == id, TestContext.Current.CancellationToken);
        db.Entry(member).Property(m => m.Status).CurrentValue = status;
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>
    /// Makes Dana Reyes staff with <paramref name="role"/>, a minute after whoever joined before,
    /// and signs her in to the admin app; answers the staff session cookie.
    /// </summary>
    public static async Task<string> SignInStaffAsync(AdminMembersFactory factory, HttpClient client, string email, StaffRoleName role = StaffRoleName.Moderator)
    {
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        await Staff.CreateAsync(factory, client, email, role);
        using var signedIn = await Staff.SignInWithCodeAsync(client, email, factory.Time.GetUtcNow());
        return Staff.Cookie(signedIn);
    }

    /// <summary>
    /// Renames the member with <paramref name="email"/> in the store: every test staff account joins
    /// as "Grace Thompson", and a search by name must tell her from the cast's Grace.
    /// </summary>
    public static async Task RenameAsync(AdminMembersFactory factory, string email, string name)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var normalized = Member.NormalizeEmail(email);
        var member = await db.Members.SingleAsync(m => m.NormalizedEmail == normalized, TestContext.Current.CancellationToken);
        db.Entry(member).Property(m => m.Name).CurrentValue = name;
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>Asks for the list with <paramref name="query"/> (such as <c>?status=flagged</c>) and answers it, asserting 200.</summary>
    public static async Task<JsonElement> ListAsync(HttpClient client, string cookie, string query = "")
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/members" + query, cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    /// <summary>The names of the list's members, in the order answered.</summary>
    public static string[] NamesOf(JsonElement list) =>
        [.. list.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("name").GetString() ?? string.Empty)];
}

/// <summary>
/// The API on a clock the tests move (AGENTS.md: never sleep), starting at
/// <see cref="AdminMembers.Today"/>, with the registration counts a test gives it: nothing
/// registers a member before slice 6.1, so <see cref="Registrations"/> stands in for the reader
/// (ADR 0015, ADR 0022).
/// </summary>
public sealed class AdminMembersFactory : ApiFactory
{
    public FakeTimeProvider Time { get; } = new(AdminMembers.Today);

    public CountingRegistrationReader Registrations { get; } = new();

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(Time);
        services.RemoveAll<IRegistrationReader>();
        services.AddSingleton<IRegistrationReader>(Registrations);
    }

    /// <summary>Answers each member's count as a test set it, and records which members were asked about.</summary>
    public sealed class CountingRegistrationReader : IRegistrationReader
    {
        private readonly Dictionary<Guid, int> _counts = [];
        private readonly List<IReadOnlyCollection<Guid>> _asked = [];
        private readonly Lock _gate = new();

        /// <summary>The members of each question asked, oldest first.</summary>
        public IReadOnlyList<IReadOnlyCollection<Guid>> Asked
        {
            get
            {
                lock (_gate)
                {
                    return [.. _asked];
                }
            }
        }

        public void Set(Guid memberId, int count)
        {
            lock (_gate)
            {
                _counts[memberId] = count;
            }
        }

        public Task<IReadOnlyList<UpcomingEventDto>> UpcomingForAsync(Guid memberId, DateTimeOffset now, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<UpcomingEventDto>>([]);

        public Task<int> GoingAsync(Guid eventId, CancellationToken cancellationToken) => Task.FromResult(0);

        public Task<IReadOnlyDictionary<Guid, int>> CountsForAsync(IReadOnlyCollection<Guid> memberIds, CancellationToken cancellationToken)
        {
            lock (_gate)
            {
                _asked.Add([.. memberIds]);
                return Task.FromResult<IReadOnlyDictionary<Guid, int>>(
                    memberIds.Where(_counts.ContainsKey).ToDictionary(id => id, id => _counts[id]));
            }
        }
    }
}
