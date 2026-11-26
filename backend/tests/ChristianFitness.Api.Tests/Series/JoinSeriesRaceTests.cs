using System.Net;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Audit;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Sessions;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-052 AC6 (ADR 0033, ADR 0101): two joins at the same moment. Both read the series with a
/// place left; the series' enrolment version refuses the second save, which forgets its rows,
/// reads the series again and decides again: <c>series_full</c> when the other member took the
/// last place, or the series unchanged when the same member's other press joined first. The store
/// stands in for the join that commits between this one's read and write.
/// </summary>
public sealed class JoinSeriesRaceTests(JoinSeriesRaceTests.Factory factory) : IClassFixture<JoinSeriesRaceTests.Factory>
{
    public sealed class Factory : AdminSeriesFactory
    {
        /// <summary>The series whose next join loses to <see cref="Rival"/>'s, once.</summary>
        public Guid RacedSeries { get; set; }

        /// <summary>The member whose join commits first.</summary>
        public Guid Rival { get; set; }

        protected override void ConfigureServices(IServiceCollection services)
        {
            base.ConfigureServices(services);
            services.RemoveAll<IAppDbContext>();
            services.AddScoped<IAppDbContext>(sp => new RacedDatabase(
                sp.GetRequiredService<AppDbContext>(), sp.GetRequiredService<IServiceScopeFactory>(), this));
        }
    }

    /// <summary>The real store, except that the first save of an enrolment in <see cref="Factory.RacedSeries"/> loses to the rival's join.</summary>
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

        public Task<bool> CanConnectAsync(CancellationToken cancellationToken) => db.Database.CanConnectAsync(cancellationToken);

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken)
        {
            var racing = db.ChangeTracker.Entries<SeriesEnrolment>()
                .Any(e => e.State == EntityState.Added && e.Entity.SeriesId == owner.RacedSeries);
            if (racing)
            {
                var seriesId = owner.RacedSeries;
                owner.RacedSeries = Guid.Empty;
                await RivalJoinsAsync(seriesId, cancellationToken);

                // PostgreSQL refuses this save whole, on the series' version. InMemory applies the
                // rows before it checks the version, so the store raises the refusal itself.
                throw new DbUpdateConcurrencyException("The series' enrolment version is no longer the one read.");
            }

            return await db.SaveChangesAsync(cancellationToken);
        }

        /// <summary>The rival joins as the API would: an enrolment and a place at every session to come.</summary>
        private async Task RivalJoinsAsync(Guid seriesId, CancellationToken cancellationToken)
        {
            using var scope = scopes.CreateScope();
            var other = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var series = await other.EventSeries.SingleAsync(s => s.Id == seriesId, cancellationToken);
            var now = owner.Time.GetUtcNow();
            series.Enrol();
            other.SeriesEnrolments.Add(SeriesEnrolment.Of(seriesId, owner.Rival, series.PriceCents, now));
            var toCome = await other.Events
                .Where(e => e.SeriesId == seriesId && e.Status == EventStatus.Published && e.StartsAt > now)
                .ToListAsync(cancellationToken);
            foreach (var session in toCome)
            {
                session.TakePlace();
                other.Registrations.Add(Registration.Of(session.Id, owner.Rival, series.PriceCents, now));
            }

            await other.SaveChangesAsync(cancellationToken);
        }
    }

    [Fact]
    public async Task Given_another_member_takes_the_last_place_first_When_this_one_saves_Then_it_is_refused_series_full()
    {
        var series = AdminSeries.NewSeries("Last Place Series", factory.Time.GetUtcNow(), capacity: 1);
        await factory.AddSeriesAsync(series, [new(new DateOnly(2026, 4, 21)), new(new DateOnly(2026, 4, 28))]);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "race.series.loser@example.org");
        var loser = await MemberSeries.MemberIdAsync(factory, "race.series.loser@example.org");
        factory.Rival = Guid.CreateVersion7();
        factory.RacedSeries = series.Id;

        using var response = await JoinSeriesTests.JoinAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("series_full", (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(
            [factory.Rival],
            await db.SeriesEnrolments.Where(e => e.SeriesId == series.Id).Select(e => e.MemberId).ToListAsync(TestContext.Current.CancellationToken));
        Assert.False(await db.Registrations.AnyAsync(r => r.MemberId == loser, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_the_same_members_other_press_joins_first_When_this_one_saves_Then_the_series_is_answered_with_no_second_place()
    {
        var series = AdminSeries.NewSeries("Double Press Series", factory.Time.GetUtcNow());
        await factory.AddSeriesAsync(series, [new(new DateOnly(2026, 4, 21)), new(new DateOnly(2026, 4, 28))]);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "race.series.twice@example.org");
        var member = await MemberSeries.MemberIdAsync(factory, "race.series.twice@example.org");
        factory.Rival = member;
        factory.RacedSeries = series.Id;

        using var response = await JoinSeriesTests.JoinAsync(client, cookie, series.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True((await AdminSeries.JsonAsync(response)).GetProperty("joined").GetBoolean());
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.SeriesEnrolments.CountAsync(e => e.SeriesId == series.Id && e.MemberId == member, TestContext.Current.CancellationToken));
        Assert.Equal(2, await db.Registrations.CountAsync(r => r.MemberId == member, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_two_requests_read_the_same_series_When_both_enrol_Then_the_store_refuses_the_second_save()
    {
        var series = AdminSeries.NewSeries("Version Series", factory.Time.GetUtcNow());
        await factory.AddSeriesAsync(series, [new(new DateOnly(2026, 5, 5))]);
        using var first = factory.Services.CreateScope();
        using var second = factory.Services.CreateScope();
        var one = first.ServiceProvider.GetRequiredService<AppDbContext>();
        var two = second.ServiceProvider.GetRequiredService<AppDbContext>();
        var seriesOne = await one.EventSeries.SingleAsync(s => s.Id == series.Id, TestContext.Current.CancellationToken);
        var seriesTwo = await two.EventSeries.SingleAsync(s => s.Id == series.Id, TestContext.Current.CancellationToken);
        seriesOne.Enrol();
        await one.SaveChangesAsync(TestContext.Current.CancellationToken);
        seriesTwo.Enrol();

        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => two.SaveChangesAsync(TestContext.Current.CancellationToken));
    }
}
