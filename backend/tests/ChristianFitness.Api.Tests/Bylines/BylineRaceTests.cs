using System.Net;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.News;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ChristianFitness.Api.Tests.Bylines;

/// <summary>
/// L2-077 AC4 and AC7 (ADR 0094): the checks that a name is free and that no story uses a byline
/// run before the save, so another request can win between them. The store then refuses: the
/// unique name key a second byline of one name, the restricted story key a removal a story now
/// uses. Each is answered with its code, never a 500, and nothing is saved. InMemory has no such
/// keys, so the store stands in for the other request and raises the <see cref="DbUpdateException"/>
/// PostgreSQL would.
/// </summary>
public sealed class BylineRaceTests(BylineRaceTests.Factory factory) : IClassFixture<BylineRaceTests.Factory>
{
    public sealed class Factory : BylinesFactory
    {
        protected override void ConfigureServices(IServiceCollection services)
        {
            base.ConfigureServices(services);
            services.RemoveAll<IAppDbContext>();
            services.AddScoped<IAppDbContext, RacedDatabase>();
        }
    }

    /// <summary>
    /// The real store, except that saving a byline named <c>Raced…</c> loses a race: for
    /// <see cref="RacedTaken"/> another request adds that name first; for removing
    /// <see cref="RacedUsed"/> another request gives it a story first.
    /// </summary>
    private sealed class RacedDatabase(AppDbContext db, IServiceScopeFactory scopes) : IAppDbContext
    {
        public DbSet<ChristianFitness.Domain.Members.Member> Members => db.Members;

        public DbSet<ChristianFitness.Domain.Members.StaffRole> StaffRoles => db.StaffRoles;

        public DbSet<ChristianFitness.Domain.Members.PasswordReset> PasswordResets => db.PasswordResets;

        public DbSet<ChristianFitness.Domain.Sessions.SignInFailure> SignInFailures => db.SignInFailures;

        public DbSet<ChristianFitness.Domain.Events.Event> Events => db.Events;

        public DbSet<ChristianFitness.Domain.Events.Registration> Registrations => db.Registrations;

        public DbSet<ChristianFitness.Domain.Events.ChatMessage> ChatMessages => db.ChatMessages;

        public DbSet<ChristianFitness.Domain.Events.ChatReadMarker> ChatReadMarkers => db.ChatReadMarkers;

        public DbSet<ChristianFitness.Domain.Events.DirectMessage> DirectMessages => db.DirectMessages;

        public DbSet<ChristianFitness.Domain.Events.MessageReport> MessageReports => db.MessageReports;

        public DbSet<ChristianFitness.Domain.Services.ProfessionalApplication> ProfessionalApplications => db.ProfessionalApplications;

        public DbSet<ChristianFitness.Domain.Services.ServiceListing> ServiceListings => db.ServiceListings;

        public DbSet<ChristianFitness.Domain.Notifications.Notification> Notifications => db.Notifications;

        public DbSet<ChristianFitness.Domain.Directory.DirectoryListing> DirectoryListings => db.DirectoryListings;

        public DbSet<ChristianFitness.Domain.Directory.ListingSuggestion> ListingSuggestions => db.ListingSuggestions;

        public DbSet<ChristianFitness.Domain.Directory.ListingConnection> ListingConnections => db.ListingConnections;

        public DbSet<ChristianFitness.Domain.Directory.ListingFollow> ListingFollows => db.ListingFollows;

        public DbSet<ChristianFitness.Domain.Directory.SuggestionCheck> SuggestionChecks => db.SuggestionChecks;

        public DbSet<ChristianFitness.Domain.Directory.ListingClaim> ListingClaims => db.ListingClaims;

        public DbSet<ChristianFitness.Domain.Events.EventSeries> EventSeries => db.EventSeries;

        public DbSet<ChristianFitness.Domain.Events.SeriesEnrolment> SeriesEnrolments => db.SeriesEnrolments;

        public DbSet<ChristianFitness.Domain.News.Byline> Bylines => db.Bylines;

        public DbSet<ChristianFitness.Domain.News.Story> Stories => db.Stories;

        public DbSet<ChristianFitness.Domain.Scheduling.SchedulerLease> SchedulerLeases => db.SchedulerLeases;
        public DbSet<ChristianFitness.Domain.Events.CommunityPick> CommunityPicks => db.CommunityPicks;

        public DbSet<ChristianFitness.Domain.News.StoryReadTally> StoryReadTallies => db.StoryReadTallies;

        public DbSet<ChristianFitness.Domain.Events.Attendance> Attendances => db.Attendances;

        public DbSet<ChristianFitness.Domain.Directory.ListingFollowChange> ListingFollowChanges => db.ListingFollowChanges;

        public DbSet<ChristianFitness.Domain.Audit.AuditEntry> AuditEntries => db.AuditEntries;

        public Task<bool> CanConnectAsync(CancellationToken cancellationToken) => db.Database.CanConnectAsync(cancellationToken);

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken)
        {
            var entry = db.ChangeTracker.Entries<Byline>().SingleOrDefault(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted);
            if (entry is null || !entry.Entity.Name.StartsWith(Raced, StringComparison.Ordinal))
            {
                return await db.SaveChangesAsync(cancellationToken);
            }

            using var scope = scopes.CreateScope();
            var other = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            if (entry.Entity.Name == RacedTaken)
            {
                other.Bylines.Add(Byline.Create(RacedTaken, "Saved first.", null, DateTimeOffset.UtcNow));
                await other.SaveChangesAsync(cancellationToken);
                throw new DbUpdateException("23505: duplicate key value violates unique constraint");
            }

            if (entry.Entity.Name == RacedUsed)
            {
                other.Stories.Add(Story.Create(entry.Entity.Id, "A story that took the byline", DateTimeOffset.UtcNow));
                await other.SaveChangesAsync(cancellationToken);
                throw new DbUpdateException("23503: update or delete violates foreign key constraint");
            }

            throw new DbUpdateException("08006: connection failure");
        }
    }

    private const string Raced = "Raced";
    private const string RacedTaken = "Raced Writer";
    private const string RacedUsed = "Raced Used Writer";

    private async Task<int> NamedAsync(string name)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Bylines.CountAsync(b => b.Name == name, TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Given_another_request_adds_the_name_first_When_the_key_refuses_this_one_Then_it_is_refused_with_byline_name_taken()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.race.taken@example.org");

        using var response = await AddBylineTests.AddAsync(client, cookie, AddBylineTests.Body(RacedTaken));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("byline_name_taken", (await AdminBylines.JsonAsync(response)).GetProperty("code").GetString());
        Assert.Equal(1, await NamedAsync(RacedTaken));
    }

    [Fact]
    public async Task Given_another_request_gives_the_byline_a_story_first_When_the_key_refuses_its_removal_Then_it_is_refused_with_byline_in_use()
    {
        var id = await factory.AddBylineAsync(RacedUsed);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.race.used@example.org");

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Delete, $"{AdminBylines.Path}/{id}", cookie);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("byline_in_use", (await AdminBylines.JsonAsync(response)).GetProperty("code").GetString());
        Assert.NotNull(await factory.FindBylineAsync(id));
    }

    [Fact]
    public async Task Given_a_save_fails_for_another_reason_When_a_byline_is_added_Then_it_is_an_unexpected_error()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.race.fault@example.org");

        using var response = await AddBylineTests.AddAsync(client, cookie, AddBylineTests.Body("Raced but free"));

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("server_error", (await AdminBylines.JsonAsync(response)).GetProperty("code").GetString());
        Assert.Equal(0, await NamedAsync("Raced but free"));
    }
}
