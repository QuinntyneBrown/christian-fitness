using System.Net;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Audit;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Sessions;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// ADR 0106: two staff record the same member at the same moment. Both find no row; the other's
/// insert commits first, so this one meets the unique pair, reads the row the other saved and
/// changes it. The last saved value stands, with one row and one audit entry per saved change.
/// The store stands in for the insert that commits between this one's read and write.
/// </summary>
public sealed class RecordAttendanceRaceTests(RecordAttendanceRaceTests.Factory factory) : IClassFixture<RecordAttendanceRaceTests.Factory>
{
    public sealed class Factory : AttendanceFactory
    {
        /// <summary>The event whose next attendance insert loses to <see cref="Rival"/>'s, once.</summary>
        public Guid RacedEvent { get; set; }

        /// <summary>The staff member whose record commits first.</summary>
        public Guid Rival { get; set; }

        protected override void ConfigureServices(IServiceCollection services)
        {
            base.ConfigureServices(services);
            services.RemoveAll<IAppDbContext>();
            services.AddScoped<IAppDbContext>(sp => new RacedDatabase(
                sp.GetRequiredService<AppDbContext>(), sp.GetRequiredService<IServiceScopeFactory>(), this));
        }
    }

    /// <summary>The real store, except that the first insert of an attendance at <see cref="Factory.RacedEvent"/> loses to the rival's.</summary>
    private sealed class RacedDatabase(AppDbContext db, IServiceScopeFactory scopes, Factory owner) : IAppDbContext
    {
        public DbSet<Member> Members => db.Members;
        public DbSet<StaffRole> StaffRoles => db.StaffRoles;
        public DbSet<PasswordReset> PasswordResets => db.PasswordResets;
        public DbSet<SignInFailure> SignInFailures => db.SignInFailures;
        public DbSet<Event> Events => db.Events;
        public DbSet<Registration> Registrations => db.Registrations;
        public DbSet<ChatMessage> ChatMessages => db.ChatMessages;
        public DbSet<ChatReadMarker> ChatReadMarkers => db.ChatReadMarkers;
        public DbSet<DirectMessage> DirectMessages => db.DirectMessages;
        public DbSet<MessageReport> MessageReports => db.MessageReports;
        public DbSet<AuditEntry> AuditEntries => db.AuditEntries;
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
        public DbSet<EventSeries> EventSeries => db.EventSeries;
        public DbSet<SeriesEnrolment> SeriesEnrolments => db.SeriesEnrolments;
        public DbSet<ChristianFitness.Domain.News.Byline> Bylines => db.Bylines;
        public DbSet<ChristianFitness.Domain.News.Story> Stories => db.Stories;
        public DbSet<ChristianFitness.Domain.Scheduling.SchedulerLease> SchedulerLeases => db.SchedulerLeases;
        public DbSet<Attendance> Attendances => db.Attendances;
        public DbSet<ChristianFitness.Domain.News.StoryReadTally> StoryReadTallies => db.StoryReadTallies;
        public DbSet<ChristianFitness.Domain.Events.CommunityPick> CommunityPicks => db.CommunityPicks;

        public Task<bool> CanConnectAsync(CancellationToken cancellationToken) => db.Database.CanConnectAsync(cancellationToken);

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken)
        {
            var racing = db.ChangeTracker.Entries<Attendance>()
                .FirstOrDefault(e => e.State == EntityState.Added && e.Entity.EventId == owner.RacedEvent);
            if (racing is not null)
            {
                owner.RacedEvent = Guid.Empty;
                using (var scope = scopes.CreateScope())
                {
                    var other = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    other.Attendances.Add(Attendance.Of(racing.Entity.EventId, racing.Entity.MemberId, !racing.Entity.Came, owner.Rival, owner.Time.GetUtcNow()));
                    await other.SaveChangesAsync(cancellationToken);
                }

                // PostgreSQL refuses the second insert of the pair on its unique index; InMemory
                // would raise another exception, so the store raises the database's own.
                throw new DbUpdateException("duplicate key value violates unique constraint \"IX_Attendances_EventId_MemberId\"");
            }

            return await db.SaveChangesAsync(cancellationToken);
        }
    }

    [Fact]
    public async Task Given_another_staff_member_records_the_member_first_When_this_tick_saves_Then_it_changes_their_row_and_is_audited()
    {
        var id = await factory.AddEventAsync("Raced Morning", startsIn: TimeSpan.FromMinutes(-10));
        using var memberClient = Browser.CreateClient(factory);
        await OwnProfileTests.JoinedAsync(memberClient, JoinTests.Details("caleb.race@example.org") with { FullName = "Caleb Moreau" });
        var caleb = await factory.MemberIdAsync("caleb.race@example.org");
        await factory.RegisterAsync(id, caleb);
        using var staff = Browser.CreateClient(factory);
        var dana = Guid.Parse(await Staff.CreateAsync(factory, staff, "dana.race@example.org", StaffRoleName.Admin));
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, staff, "dana.race@example.org");
        factory.Rival = Guid.CreateVersion7();
        factory.RacedEvent = id;

        using var response = await AdminEvents.SendAsync(staff, HttpMethod.Put, $"/api/admin/events/{id}/attendance/{caleb}", Staff.Cookie(signedIn), new { came = true });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var row = Assert.Single(await db.Attendances.AsNoTracking().Where(a => a.EventId == id).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((caleb, true, dana), (row.MemberId, row.Came, row.RecordedBy));
        Assert.Equal(
            [(dana, "event.attendance_recorded")],
            await db.AuditEntries.AsNoTracking().Where(e => e.RecordId == id).Select(e => ValueTuple.Create(e.ActorMemberId, e.Action)).ToListAsync(TestContext.Current.CancellationToken));
    }
}
