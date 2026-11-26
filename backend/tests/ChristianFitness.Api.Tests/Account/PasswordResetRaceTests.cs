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
using static ChristianFitness.Api.Tests.Account.PasswordResetCompleteTests;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-045 AC7: two saves with one link at the same moment both find it unused; only the first sets
/// the password and the second is refused <c>reset_link_expired</c>, keeping nothing of its own.
/// The store stands in for the other save: just before this one is written, another request spends
/// the link and sets its own password, as it would between this request's read and its write.
/// </summary>
public sealed class PasswordResetRaceTests(PasswordResetRaceTests.Factory factory) : IClassFixture<PasswordResetRaceTests.Factory>
{
    private const string RivalPassword = "rivalpassword";

    public sealed class Factory : ApiFactory
    {
        protected override void ConfigureServices(IServiceCollection services)
        {
            services.RemoveAll<IAppDbContext>();
            services.AddScoped<IAppDbContext, RacedDatabase>();
        }
    }

    /// <summary>The real store, except that a save spending a reset loses the race to another request.</summary>
    private sealed class RacedDatabase(AppDbContext db, IServiceScopeFactory scopes, IPasswordHasherService hasher) : IAppDbContext
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
        public DbSet<AuditEntry> AuditEntries => db.AuditEntries;

        public Task<bool> CanConnectAsync(CancellationToken cancellationToken) => db.Database.CanConnectAsync(cancellationToken);

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken)
        {
            var spending = db.ChangeTracker.Entries<PasswordReset>()
                .Where(e => e.State == EntityState.Modified && e.OriginalValues.GetValue<DateTimeOffset?>(nameof(PasswordReset.UsedAt)) is null)
                .Select(e => e.Entity.Id)
                .ToList();
            if (spending.Count > 0)
            {
                // The other save commits first, from its own request.
                using var scope = scopes.CreateScope();
                var other = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var resets = await other.PasswordResets.Where(r => spending.Contains(r.Id)).ToListAsync(cancellationToken);
                var member = await other.Members.SingleAsync(m => m.Id == resets[0].MemberId, cancellationToken);
                member.ChangePassword(hasher.Hash(RivalPassword));
                foreach (var reset in resets)
                {
                    reset.Use(DateTimeOffset.UtcNow);
                }

                await other.SaveChangesAsync(cancellationToken);
            }

            return await db.SaveChangesAsync(cancellationToken);
        }
    }

    [Fact]
    public async Task Given_another_save_spends_the_link_first_When_this_one_is_written_Then_it_is_refused_with_reset_link_expired_and_keeps_nothing()
    {
        using var client = Browser.CreateClient(factory);
        var token = await LinkForAsync(factory, client, "grace.race@example.org");

        using var response = await CompleteAsync(client, token, NewPassword);

        Assert.Equal(HttpStatusCode.Gone, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("reset_link_expired", problem.GetProperty("code").GetString());
        using var withRival = await Browser.SignInAsync(client, "grace.race@example.org", RivalPassword);
        using var withOurs = await Browser.SignInAsync(client, "grace.race@example.org", NewPassword);
        Assert.Equal(HttpStatusCode.OK, withRival.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, withOurs.StatusCode);
    }
}
