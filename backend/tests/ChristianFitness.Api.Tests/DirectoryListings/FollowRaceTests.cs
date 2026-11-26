using System.Net;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-056 AC4 (ADR 0088): two follows of one listing by one member at the same moment both find no
/// follow; the pair's key refuses the second save, which is answered as a follow, never a 500.
/// InMemory has no key conflict across requests, so the store stands in for the other request and
/// raises the <see cref="DbUpdateException"/> PostgreSQL would.
/// </summary>
public sealed class FollowRaceTests(FollowRaceTests.Factory factory) : IClassFixture<FollowRaceTests.Factory>
{
    public sealed class Factory : ApiFactory
    {
        protected override void ConfigureServices(IServiceCollection services)
        {
            services.RemoveAll<IAppDbContext>();
            services.AddScoped<IAppDbContext, RacedDatabase>();
        }
    }

    /// <summary>The real store, except that saving a follow of a listing named <c>Raced…</c> loses a race.</summary>
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
        public DbSet<ChristianFitness.Domain.Feedback.FeedbackNote> FeedbackNotes => db.FeedbackNotes;

        public DbSet<ChristianFitness.Domain.Events.Attendance> Attendances => db.Attendances;


        public DbSet<ChristianFitness.Domain.Newsletter.NewsletterSubscription> NewsletterSubscriptions => db.NewsletterSubscriptions;


        public DbSet<ChristianFitness.Domain.Newsletter.SubscriptionConfirmation> SubscriptionConfirmations => db.SubscriptionConfirmations;


        public DbSet<ChristianFitness.Domain.Newsletter.NewsletterUnsubscribeToken> NewsletterUnsubscribeTokens => db.NewsletterUnsubscribeTokens;

        public DbSet<ChristianFitness.Domain.Directory.ListingFollowChange> ListingFollowChanges => db.ListingFollowChanges;

        public DbSet<ChristianFitness.Domain.Audit.AuditEntry> AuditEntries => db.AuditEntries;

        public Task<bool> CanConnectAsync(CancellationToken cancellationToken) => db.Database.CanConnectAsync(cancellationToken);

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken)
        {
            var follow = db.ChangeTracker.Entries<ListingFollow>().Where(e => e.State == EntityState.Added).Select(e => e.Entity).SingleOrDefault();
            var name = follow is null
                ? null
                : await db.DirectoryListings.AsNoTracking().Where(l => l.Id == follow.ListingId).Select(l => l.Name).SingleAsync(cancellationToken);
            if (name is null || !name.StartsWith(Raced, StringComparison.Ordinal))
            {
                return await db.SaveChangesAsync(cancellationToken);
            }

            // The other follow commits first, from its own request.
            if (name == RacedTaken)
            {
                using var scope = scopes.CreateScope();
                var other = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                other.ListingFollows.Add(ListingFollow.Of(follow!.MemberId, follow.ListingId, follow.FollowedAt));
                await other.SaveChangesAsync(cancellationToken);
            }

            throw new DbUpdateException("23505: duplicate key value violates unique constraint");
        }
    }

    private const string Raced = "Raced";
    private const string RacedTaken = "Raced Runners";

    private async Task<Guid> ListingAsync(string name)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var listing = DirectoryListing.CreateDraft(Guid.CreateVersion7(), ListingKind.Organization, name, "A tagline", "Etobicoke", [], DateTimeOffset.UtcNow, string.Empty, null, false);
        listing.Publish(DateTimeOffset.UtcNow);
        db.DirectoryListings.Add(listing);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return listing.Id;
    }

    private async Task<int> FollowsOfAsync(Guid listing)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.ListingFollows.CountAsync(f => f.ListingId == listing, TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Given_another_request_saves_the_same_follow_first_When_the_key_refuses_this_one_Then_it_is_answered_as_a_follow()
    {
        var grace = await FollowListingTests.MemberAsync(factory, "grace.follow-race@example.org");
        var listing = await ListingAsync(RacedTaken);

        var (status, body) = await FollowListingTests.SendAsync(factory, HttpMethod.Put, listing, grace);

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.True(body.GetProperty("following").GetBoolean());
        Assert.Equal(1, body.GetProperty("followers").GetInt32());
        Assert.Equal(1, await FollowsOfAsync(listing));
    }

    [Fact]
    public async Task Given_a_save_fails_for_another_reason_When_a_member_follows_Then_it_is_an_unexpected_error()
    {
        var grace = await FollowListingTests.MemberAsync(factory, "grace.follow-fault@example.org");
        var listing = await ListingAsync("Raced but not taken");

        var (status, body) = await FollowListingTests.SendAsync(factory, HttpMethod.Put, listing, grace);

        Assert.Equal(HttpStatusCode.InternalServerError, status);
        Assert.Equal("server_error", body.GetProperty("code").GetString());
        Assert.Equal(0, await FollowsOfAsync(listing));
    }
}
