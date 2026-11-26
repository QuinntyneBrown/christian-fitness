using System.Net;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.News;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// ADR 0105: two reads of a story saved at once both count. The tally's key refuses a second first
/// row of the day, and its count, the concurrency token, refuses a count that moved on; the read
/// that loses reads the tally again and adds itself. InMemory has neither check, so the store
/// stands in for the other read and raises the <see cref="DbUpdateException"/> PostgreSQL would.
/// </summary>
public sealed class StoryReadRaceTests(StoryReadRaceTests.Factory factory) : IClassFixture<StoryReadRaceTests.Factory>
{
    private const string Safari = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";

    public sealed class Factory : StoriesFactory
    {
        /// <summary>The stories whose next read loses a race to another read of the same story.</summary>
        public HashSet<Guid> Raced { get; } = [];

        protected override void ConfigureServices(IServiceCollection services)
        {
            base.ConfigureServices(services);
            services.RemoveAll<IAppDbContext>();
            services.AddScoped<IAppDbContext>(provider => new RacedDatabase(provider.GetRequiredService<AppDbContext>(), provider.GetRequiredService<IServiceScopeFactory>(), Raced));
        }
    }

    /// <summary>The real store, except that the next save of a raced story's tally finds another read saved first.</summary>
    private sealed class RacedDatabase(AppDbContext db, IServiceScopeFactory scopes, HashSet<Guid> raced) : IAppDbContext
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

        public DbSet<Byline> Bylines => db.Bylines;

        public DbSet<Story> Stories => db.Stories;

        public DbSet<StoryReadTally> StoryReadTallies => db.StoryReadTallies;

        public DbSet<ChristianFitness.Domain.Directory.ListingFollowChange> ListingFollowChanges => db.ListingFollowChanges;

        public DbSet<ChristianFitness.Domain.Audit.AuditEntry> AuditEntries => db.AuditEntries;

        public Task<bool> CanConnectAsync(CancellationToken cancellationToken) => db.Database.CanConnectAsync(cancellationToken);

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken)
        {
            var entry = db.ChangeTracker.Entries<StoryReadTally>().SingleOrDefault(e => e.State is EntityState.Added or EntityState.Modified);
            if (entry is null || !raced.Remove(entry.Entity.StoryId))
            {
                return await db.SaveChangesAsync(cancellationToken);
            }

            // The other read, saved first through its own context.
            using var scope = scopes.CreateScope();
            var other = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var theirs = await other.StoryReadTallies.SingleOrDefaultAsync(t => t.StoryId == entry.Entity.StoryId && t.Day == entry.Entity.Day, cancellationToken);
            if (theirs is null)
            {
                other.StoryReadTallies.Add(StoryReadTally.First(entry.Entity.StoryId, entry.Entity.Day));
            }
            else
            {
                theirs.Add();
            }

            await other.SaveChangesAsync(cancellationToken);
            throw entry.State == EntityState.Added
                ? new DbUpdateException("23505: duplicate key value violates unique constraint")
                : new DbUpdateConcurrencyException("The database operation was expected to affect 1 row(s), but actually affected 0 row(s).");
        }
    }

    private async Task<int> ReadsAsync(Guid id)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.StoryReadTallies.Where(t => t.StoryId == id).SumAsync(t => t.Count, TestContext.Current.CancellationToken);
    }

    private async Task<HttpStatusCode> CountAsync(Guid id)
    {
        using var client = Browser.CreateClient(factory);
        client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", Safari);
        using var response = await Browser.SendAsync(client, HttpMethod.Post, $"{ReadStoryTests.Path}/{id}/reads", null);
        return response.StatusCode;
    }

    [Fact]
    public async Task Given_another_read_adds_the_days_first_row_first_When_this_read_is_saved_Then_both_count()
    {
        var story = await factory.PutStoryAsync("Raced first read", StoryStatus.Published, slug: "raced-first-read");
        factory.Raced.Add(story.Id);

        var status = await CountAsync(story.Id);

        Assert.Equal((HttpStatusCode.NoContent, 2), (status, await ReadsAsync(story.Id)));
    }

    [Fact]
    public async Task Given_another_read_moves_the_days_count_on_first_When_this_read_is_saved_Then_both_count()
    {
        var story = await factory.PutStoryAsync("Raced later read", StoryStatus.Published, slug: "raced-later-read");
        await CountAsync(story.Id);
        factory.Raced.Add(story.Id);

        var status = await CountAsync(story.Id);

        Assert.Equal((HttpStatusCode.NoContent, 3), (status, await ReadsAsync(story.Id)));
    }
}
