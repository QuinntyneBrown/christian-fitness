using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
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
/// L2-011 AC3 (ADR 0033): two members take the last place at the same moment. Both read one place
/// left; the event's version refuses the second save, which reloads, finds the event full and is
/// answered <c>event_full</c>. The store stands in for the first member, who commits between the
/// second one's read and write.
/// </summary>
public sealed class LastPlaceRaceTests(LastPlaceRaceTests.Factory factory) : IClassFixture<LastPlaceRaceTests.Factory>
{
    public sealed class Factory : ApiFactory
    {
        public Guid RacedEvent { get; set; }

        protected override void ConfigureServices(IServiceCollection services)
        {
            services.RemoveAll<IAppDbContext>();
            services.AddScoped<IAppDbContext>(sp => new RacedDatabase(
                sp.GetRequiredService<AppDbContext>(), sp.GetRequiredService<IServiceScopeFactory>(), this));
        }

        public async Task<Guid> AddEventAsync(string title, int capacity)
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var now = DateTimeOffset.UtcNow;
            var e = Event.CreateDraft(title, EventCategory.Run, now.AddDays(3), "Martin Goodman Trail", "Waterfront, Toronto", 0, capacity, "Come run with us.", now);
            e.Publish();
            db.Events.Add(e);
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
            return e.Id;
        }
    }

    /// <summary>The real store, except that the first save of a registration for <see cref="Factory.RacedEvent"/> loses to another member's.</summary>
    private sealed class RacedDatabase(AppDbContext db, IServiceScopeFactory scopes, Factory owner) : IAppDbContext
    {
        public DbSet<Member> Members => db.Members;

        public DbSet<StaffRole> StaffRoles => db.StaffRoles;

        public DbSet<PasswordReset> PasswordResets => db.PasswordResets;
        public DbSet<SignInFailure> SignInFailures => db.SignInFailures;

        public DbSet<StaffTwoStep> StaffTwoSteps => db.StaffTwoSteps;

        public DbSet<TwoStepChallenge> TwoStepChallenges => db.TwoStepChallenges;

        public DbSet<TwoStepFailure> TwoStepFailures => db.TwoStepFailures;

        public DbSet<Event> Events => db.Events;

        public DbSet<Registration> Registrations => db.Registrations;

        public DbSet<ChatMessage> ChatMessages => db.ChatMessages;
        public DbSet<ChatReadMarker> ChatReadMarkers => db.ChatReadMarkers;
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
        public DbSet<AuditEntry> AuditEntries => db.AuditEntries;

        public Task<bool> CanConnectAsync(CancellationToken cancellationToken) => db.Database.CanConnectAsync(cancellationToken);

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken)
        {
            var racing = db.ChangeTracker.Entries<Registration>()
                .Any(r => r.State == EntityState.Added && r.Entity.EventId == owner.RacedEvent);
            if (racing)
            {
                owner.RacedEvent = Guid.Empty;
                using var scope = scopes.CreateScope();
                var other = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var e = await other.Events.SingleAsync(x => x.Id == db.ChangeTracker.Entries<Registration>().First().Entity.EventId, cancellationToken);
                e.TakePlace();
                other.Registrations.Add(Registration.Of(e.Id, Guid.NewGuid(), e.PriceCents, DateTimeOffset.UtcNow));
                await other.SaveChangesAsync(cancellationToken);

                // PostgreSQL refuses this save whole, on the event's version. InMemory applies the
                // registration before it checks the version, so the store raises the refusal itself.
                throw new DbUpdateConcurrencyException("The event's registration version is no longer the one read.");
            }

            return await db.SaveChangesAsync(cancellationToken);
        }
    }

    [Fact]
    public async Task Given_another_member_takes_the_last_place_first_When_this_one_saves_Then_it_is_refused_event_full()
    {
        var id = await factory.AddEventAsync("Last Place Run", capacity: 1);
        factory.RacedEvent = id;
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("race.loser@example.org"));

        using var response = await Browser.SendAsync(client, HttpMethod.Post, $"/api/events/{id}/registrations", cookie);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("event_full", problem.GetProperty("code").GetString());
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.Registrations.CountAsync(r => r.EventId == id, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_two_requests_read_the_same_event_When_both_take_a_place_Then_the_store_refuses_the_second_save()
    {
        var id = await factory.AddEventAsync("Version Run", capacity: 1);
        using var first = factory.Services.CreateScope();
        using var second = factory.Services.CreateScope();
        var one = first.ServiceProvider.GetRequiredService<AppDbContext>();
        var two = second.ServiceProvider.GetRequiredService<AppDbContext>();
        var eventOne = await one.Events.SingleAsync(e => e.Id == id, TestContext.Current.CancellationToken);
        var eventTwo = await two.Events.SingleAsync(e => e.Id == id, TestContext.Current.CancellationToken);
        eventOne.TakePlace();
        await one.SaveChangesAsync(TestContext.Current.CancellationToken);
        eventTwo.TakePlace();

        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => two.SaveChangesAsync(TestContext.Current.CancellationToken));
    }
}
