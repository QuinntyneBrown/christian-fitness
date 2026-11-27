using ChristianFitness.Api.Scheduling;
using ChristianFitness.Api.Tests.Stories;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.News;
using ChristianFitness.Domain.Scheduling;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ChristianFitness.Api.Tests.Scheduling;

/// <summary>
/// ADR 0069 and ADR 0104: taking the lease is atomic. Between a replica reading the free lease and
/// storing its take, another replica takes it; the store then refuses the first take, which skips
/// its tick and publishes nothing, while the rival holds the lease. InMemory runs one request at a
/// time, so the store stands in for the rival: on the first replica's save of the lease it stores
/// the rival's take from a scope of its own, as PostgreSQL would have committed it.
/// </summary>
public sealed class LeaseRaceTests(LeaseRaceTests.Factory factory) : IClassFixture<LeaseRaceTests.Factory>
{
    public sealed class Factory : StoriesFactory
    {
        protected override void ConfigureServices(IServiceCollection services)
        {
            base.ConfigureServices(services);
            services.RemoveAll<IAppDbContext>();
            services.AddScoped<IAppDbContext, RacedDatabase>();
        }
    }

    /// <summary>The rival replica, which takes the lease first.</summary>
    private const string Rival = "replica-rival";

    /// <summary>The real store, except that a take of the lease by anyone but <see cref="Rival"/> loses to the rival's.</summary>
    private sealed class RacedDatabase(AppDbContext db, IServiceScopeFactory scopes, TimeProvider time) : IAppDbContext
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
        public DbSet<ChristianFitness.Domain.Feedback.FeedbackNote> FeedbackNotes => db.FeedbackNotes;

        public DbSet<ChristianFitness.Domain.Events.Attendance> Attendances => db.Attendances;


        public DbSet<ChristianFitness.Domain.Newsletter.NewsletterSubscription> NewsletterSubscriptions => db.NewsletterSubscriptions;


        public DbSet<ChristianFitness.Domain.Newsletter.SubscriptionConfirmation> SubscriptionConfirmations => db.SubscriptionConfirmations;


        public DbSet<ChristianFitness.Domain.Newsletter.NewsletterUnsubscribeToken> NewsletterUnsubscribeTokens => db.NewsletterUnsubscribeTokens;
        public DbSet<ChristianFitness.Domain.Newsletter.NewsletterIssue> NewsletterIssues => db.NewsletterIssues;
        public DbSet<ChristianFitness.Domain.Members.MemberPreferences> MemberPreferences => db.MemberPreferences;
        public DbSet<ChristianFitness.Domain.Feedback.FeedbackReply> FeedbackReplies => db.FeedbackReplies;
        public DbSet<ChristianFitness.Domain.Newsletter.IssueDelivery> IssueDeliveries => db.IssueDeliveries;

        public DbSet<ChristianFitness.Domain.Directory.ListingFollowChange> ListingFollowChanges => db.ListingFollowChanges;

        public DbSet<ChristianFitness.Domain.Audit.AuditEntry> AuditEntries => db.AuditEntries;

        public Task<bool> CanConnectAsync(CancellationToken cancellationToken) => db.Database.CanConnectAsync(cancellationToken);

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken)
        {
            var taking = db.ChangeTracker.Entries<SchedulerLease>().FirstOrDefault(e => e.State is EntityState.Modified or EntityState.Added && e.Entity.Holder != Rival);
            if (taking is not null)
            {
                using var scope = scopes.CreateScope();
                var other = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var lease = await other.SchedulerLeases.SingleOrDefaultAsync(l => l.Name == PublishingClock.LeaseName, cancellationToken);
                if (lease is null)
                {
                    lease = SchedulerLease.Create(PublishingClock.LeaseName, time.GetUtcNow());
                    other.SchedulerLeases.Add(lease);
                }

                Assert.True(lease.TryTake(Rival, time.GetUtcNow(), PublishingClock.LeaseDuration), "The rival takes a free lease.");
                await other.SaveChangesAsync(cancellationToken);
                if (taking.State == EntityState.Added)
                {
                    // PostgreSQL refuses the second insert of one key; InMemory throws an ArgumentException instead.
                    throw new DbUpdateException("duplicate key value violates unique constraint \"PK_SchedulerLeases\"");
                }
            }

            return await db.SaveChangesAsync(cancellationToken);
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Given_another_replica_takes_the_lease_between_a_read_and_a_take_When_the_tick_stores_its_take_Then_it_is_refused_and_the_tick_publishes_nothing(bool everTaken)
    {
        factory.Time.Advance(TimeSpan.FromMinutes(5));
        await using (var setup = factory.Services.CreateAsyncScope())
        {
            var store = setup.ServiceProvider.GetRequiredService<AppDbContext>();
            store.SchedulerLeases.RemoveRange(store.SchedulerLeases);
            if (everTaken)
            {
                var expired = SchedulerLease.Create(PublishingClock.LeaseName, factory.Time.GetUtcNow());
                expired.TryTake("replica-gone", factory.Time.GetUtcNow().AddMinutes(-2), PublishingClock.LeaseDuration);
                store.SchedulerLeases.Add(expired);
            }

            await store.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        var story = await factory.PutStoryAsync("Raced lease due story", StoryStatus.Scheduled, at: factory.Time.GetUtcNow().AddHours(-1), publishAt: factory.Time.GetUtcNow().AddMinutes(-1));
        var clock = ActivatorUtilities.CreateInstance<PublishingClock>(factory.Services, "replica-late");

        var tick = await clock.TickAsync(TestContext.Current.CancellationToken);

        Assert.Equal(new PublishingTick(false, 0), tick);
        Assert.Equal(StoryStatus.Scheduled, (await factory.FindStoryAsync(story.Id))!.Status);
        using var scope = factory.Services.CreateScope();
        var lease = await scope.ServiceProvider.GetRequiredService<AppDbContext>().SchedulerLeases.AsNoTracking().SingleAsync(TestContext.Current.CancellationToken);
        Assert.Equal(Rival, lease.Holder);
    }
}
