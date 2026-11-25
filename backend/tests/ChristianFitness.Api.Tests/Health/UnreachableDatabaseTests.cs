using System.Net;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Audit;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Sessions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ChristianFitness.Api.Tests.Health;

/// <summary>L2-040 AC2: readiness reports an unreachable database as unhealthy, without its detail.</summary>
public sealed class UnreachableDatabaseTests(UnreachableDatabaseTests.Factory factory) : IClassFixture<UnreachableDatabaseTests.Factory>
{
    private const string Secret = "Host=db.internal password=hunter2";

    public sealed class Factory : ApiFactory
    {
        protected override void ConfigureServices(IServiceCollection services)
        {
            services.RemoveAll<IAppDbContext>();
            services.AddScoped<IAppDbContext, UnreachableDatabase>();
        }
    }

    private sealed class UnreachableDatabase : IAppDbContext
    {
        public DbSet<Member> Members => throw new InvalidOperationException(Secret);

        public DbSet<StaffRole> StaffRoles => throw new InvalidOperationException(Secret);

        public DbSet<PasswordReset> PasswordResets => throw new InvalidOperationException(Secret);
        public DbSet<SignInFailure> SignInFailures => throw new InvalidOperationException(Secret);

        public DbSet<StaffTwoStep> StaffTwoSteps => throw new InvalidOperationException(Secret);

        public DbSet<TwoStepChallenge> TwoStepChallenges => throw new InvalidOperationException(Secret);

        public DbSet<TwoStepFailure> TwoStepFailures => throw new InvalidOperationException(Secret);

        public DbSet<ChristianFitness.Domain.Events.Event> Events => throw new InvalidOperationException(Secret);

        public DbSet<ChristianFitness.Domain.Events.Registration> Registrations => throw new InvalidOperationException(Secret);

        public DbSet<ChristianFitness.Domain.Events.ChatMessage> ChatMessages => throw new InvalidOperationException(Secret);
        public DbSet<ChristianFitness.Domain.Events.ChatReadMarker> ChatReadMarkers => throw new InvalidOperationException(Secret);
        public DbSet<ChristianFitness.Domain.Events.DirectMessage> DirectMessages => throw new InvalidOperationException(Secret);
        public DbSet<ChristianFitness.Domain.Events.MessageReport> MessageReports => throw new InvalidOperationException(Secret);
        public DbSet<ChristianFitness.Domain.Services.ProfessionalApplication> ProfessionalApplications => throw new InvalidOperationException(Secret);
        public DbSet<ChristianFitness.Domain.Services.ServiceListing> ServiceListings => throw new InvalidOperationException(Secret);

        public DbSet<ChristianFitness.Domain.Notifications.Notification> Notifications => throw new InvalidOperationException(Secret);
        public DbSet<ChristianFitness.Domain.Directory.DirectoryListing> DirectoryListings => throw new InvalidOperationException(Secret);

        public DbSet<ChristianFitness.Domain.Directory.ListingSuggestion> ListingSuggestions => throw new InvalidOperationException(Secret);
        public DbSet<ChristianFitness.Domain.Directory.ListingConnection> ListingConnections => throw new InvalidOperationException(Secret);
        public DbSet<AuditEntry> AuditEntries => throw new InvalidOperationException(Secret);

        public Task<bool> CanConnectAsync(CancellationToken cancellationToken) =>
            throw new InvalidOperationException(Secret);

        public Task<int> SaveChangesAsync(CancellationToken cancellationToken) =>
            throw new InvalidOperationException(Secret);
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/health/ready")]
    public async Task Given_an_unreachable_database_When_readiness_is_probed_Then_it_answers_unhealthy_without_detail(string path)
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(new Uri(path, UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("Unhealthy", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_an_unreachable_database_When_liveness_is_probed_Then_the_process_is_still_healthy()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(new Uri("/health/live", UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
