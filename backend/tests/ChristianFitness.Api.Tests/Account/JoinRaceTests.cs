using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-003 AC2: two joins with one email at the same moment both pass the lookup; the database's
/// unique index refuses the second save, which is answered <c>email_taken</c>, never a 500.
/// InMemory has no unique index, so the store stands in for the other join and raises the
/// <see cref="DbUpdateException"/> PostgreSQL would.
/// </summary>
public sealed class JoinRaceTests(JoinRaceTests.Factory factory) : IClassFixture<JoinRaceTests.Factory>
{
    public sealed class Factory : ApiFactory
    {
        protected override void ConfigureServices(IServiceCollection services)
        {
            services.RemoveAll<IAppDbContext>();
            services.AddScoped<IAppDbContext, RacedDatabase>();
        }
    }

    /// <summary>The real store, except that a save of a member whose email is <see cref="Raced"/> loses a race.</summary>
    private sealed class RacedDatabase(AppDbContext db, IServiceScopeFactory scopes) : IAppDbContext
    {
        public DbSet<Member> Members => db.Members;

        public DbSet<StaffRole> StaffRoles => db.StaffRoles;

        public DbSet<PasswordReset> PasswordResets => db.PasswordResets;

        public Task<bool> CanConnectAsync(CancellationToken cancellationToken) => db.Database.CanConnectAsync(cancellationToken);

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken)
        {
            var adding = db.ChangeTracker.Entries<Member>().Where(e => e.State == EntityState.Added).Select(e => e.Entity).ToList();
            var raced = adding.FirstOrDefault(m => m.NormalizedEmail.StartsWith(Raced, StringComparison.Ordinal));
            if (raced is null)
            {
                return await db.SaveChangesAsync(cancellationToken);
            }

            // The other join commits first, from its own request.
            if (raced.NormalizedEmail == RacedTaken)
            {
                using var scope = scopes.CreateScope();
                var other = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                other.Members.Add(Member.Join("Other Visitor", raced.Email, "hash", raced.JoinedAt));
                await other.SaveChangesAsync(cancellationToken);
            }

            throw new DbUpdateException("23505: duplicate key value violates unique constraint");
        }
    }

    private const string Raced = "raced.";
    private const string RacedTaken = "raced.grace@example.org";

    [Fact]
    public async Task Given_another_join_saves_the_same_email_first_When_the_unique_index_refuses_this_one_Then_it_is_refused_with_email_taken()
    {
        using var client = CreateClient();

        using var response = await JoinAsync(client, JoinTests.Details("Raced.Grace@example.org"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("email_taken", problem.GetProperty("code").GetString());
        Assert.Null(Browser.SessionSetCookie(response));
        Assert.Equal(["Other Visitor"], await NamesWithAsync(RacedTaken));
    }

    [Fact]
    public async Task Given_a_save_fails_for_another_reason_When_a_visitor_joins_Then_it_is_an_unexpected_error()
    {
        using var client = CreateClient();

        using var response = await JoinAsync(client, JoinTests.Details("raced.other@example.org"));

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("server_error", problem.GetProperty("code").GetString());
        Assert.Empty(await NamesWithAsync("raced.other@example.org"));
    }

    private HttpClient CreateClient() =>
        Browser.CreateClient(factory);

    private static Task<HttpResponseMessage> JoinAsync(HttpClient client, JoinTests.JoinBody body) =>
        client.PostAsJsonAsync(new Uri("/api/account/join", UriKind.Relative), body, TestContext.Current.CancellationToken);

    private async Task<string[]> NamesWithAsync(string normalizedEmail)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Members.AsNoTracking().Where(m => m.NormalizedEmail == normalizedEmail).Select(m => m.Name).ToArrayAsync(TestContext.Current.CancellationToken);
    }
}
