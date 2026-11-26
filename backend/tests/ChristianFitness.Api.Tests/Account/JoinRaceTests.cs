using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Audit;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Sessions;
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
        public DbSet<SignInFailure> SignInFailures => db.SignInFailures;

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

        public DbSet<ChristianFitness.Domain.Directory.ListingFollowChange> ListingFollowChanges => db.ListingFollowChanges;

        public DbSet<ChristianFitness.Domain.Directory.ListingFollow> ListingFollows => db.ListingFollows;

        public DbSet<ChristianFitness.Domain.Directory.SuggestionCheck> SuggestionChecks => db.SuggestionChecks;

        public DbSet<ChristianFitness.Domain.Directory.ListingClaim> ListingClaims => db.ListingClaims;

        public DbSet<ChristianFitness.Domain.Events.EventSeries> EventSeries => db.EventSeries;

        public DbSet<ChristianFitness.Domain.Events.SeriesEnrolment> SeriesEnrolments => db.SeriesEnrolments;

        public DbSet<ChristianFitness.Domain.News.Byline> Bylines => db.Bylines;

        public DbSet<ChristianFitness.Domain.News.Story> Stories => db.Stories;

        public DbSet<ChristianFitness.Domain.Scheduling.SchedulerLease> SchedulerLeases => db.SchedulerLeases;

        public DbSet<ChristianFitness.Domain.News.StoryReadTally> StoryReadTallies => db.StoryReadTallies;
        public DbSet<ChristianFitness.Domain.Events.CommunityPick> CommunityPicks => db.CommunityPicks;
        public DbSet<ChristianFitness.Domain.Events.Attendance> Attendances => db.Attendances;
        public DbSet<ChristianFitness.Domain.Feedback.FeedbackNote> FeedbackNotes => db.FeedbackNotes;
        public DbSet<ChristianFitness.Domain.Newsletter.NewsletterSubscription> NewsletterSubscriptions => db.NewsletterSubscriptions;
        public DbSet<ChristianFitness.Domain.Newsletter.SubscriptionConfirmation> SubscriptionConfirmations => db.SubscriptionConfirmations;
        public DbSet<ChristianFitness.Domain.Newsletter.NewsletterUnsubscribeToken> NewsletterUnsubscribeTokens => db.NewsletterUnsubscribeTokens;
        public DbSet<AuditEntry> AuditEntries => db.AuditEntries;

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
