using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Audit;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.News;
using ChristianFitness.Domain.Newsletter;
using ChristianFitness.Domain.Scheduling;
using ChristianFitness.Domain.Notifications;
using ChristianFitness.Domain.Services;
using ChristianFitness.Domain.Sessions;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Infrastructure.Persistence;

/// <summary>The Christian Fitness database: PostgreSQL in production (ADR 0004), InMemory in tests.</summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<Member> Members => Set<Member>();

    public DbSet<StaffRole> StaffRoles => Set<StaffRole>();

    public DbSet<PasswordReset> PasswordResets => Set<PasswordReset>();
    public DbSet<SignInFailure> SignInFailures => Set<SignInFailure>();

    public DbSet<Event> Events => Set<Event>();

    public DbSet<Registration> Registrations => Set<Registration>();

    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<ChatReadMarker> ChatReadMarkers => Set<ChatReadMarker>();
    public DbSet<DirectMessage> DirectMessages => Set<DirectMessage>();
    public DbSet<MessageReport> MessageReports => Set<MessageReport>();

    public DbSet<ProfessionalApplication> ProfessionalApplications => Set<ProfessionalApplication>();

    public DbSet<ServiceListing> ServiceListings => Set<ServiceListing>();

    public DbSet<Notification> Notifications => Set<Notification>();

    public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();

    public DbSet<DirectoryListing> DirectoryListings => Set<DirectoryListing>();

    public DbSet<ListingSuggestion> ListingSuggestions => Set<ListingSuggestion>();

    public DbSet<ListingConnection> ListingConnections => Set<ListingConnection>();

    public DbSet<ListingFollowChange> ListingFollowChanges => Set<ListingFollowChange>();

    public DbSet<ListingFollow> ListingFollows => Set<ListingFollow>();

    public DbSet<SuggestionCheck> SuggestionChecks => Set<SuggestionCheck>();

    public DbSet<ListingClaim> ListingClaims => Set<ListingClaim>();

    public DbSet<EventSeries> EventSeries => Set<EventSeries>();

    public DbSet<SeriesEnrolment> SeriesEnrolments => Set<SeriesEnrolment>();

    public DbSet<Byline> Bylines => Set<Byline>();

    public DbSet<Story> Stories => Set<Story>();

    public DbSet<SchedulerLease> SchedulerLeases => Set<SchedulerLease>();
    public DbSet<CommunityPick> CommunityPicks => Set<CommunityPick>();

    public DbSet<StoryReadTally> StoryReadTallies => Set<StoryReadTally>();

    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<ChristianFitness.Domain.Feedback.FeedbackNote> FeedbackNotes => Set<ChristianFitness.Domain.Feedback.FeedbackNote>();

    public DbSet<NewsletterSubscription> NewsletterSubscriptions => Set<NewsletterSubscription>();

    public DbSet<SubscriptionConfirmation> SubscriptionConfirmations => Set<SubscriptionConfirmation>();

    public DbSet<NewsletterUnsubscribeToken> NewsletterUnsubscribeTokens => Set<NewsletterUnsubscribeToken>();

    public DbSet<NewsletterIssue> NewsletterIssues => Set<NewsletterIssue>();

    public DbSet<IssueDelivery> IssueDeliveries => Set<IssueDelivery>();

    /// <summary>The signed-in sessions (<see cref="Security.DatabaseTicketStore"/>); only the cookie scheme reads them.</summary>
    public DbSet<SessionRecord> Sessions => Set<SessionRecord>();

    public Task<bool> CanConnectAsync(CancellationToken cancellationToken) =>
        Database.CanConnectAsync(cancellationToken);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Trigram indexes serve the directory's "contains" search (ADR 0082).
        modelBuilder.HasPostgresExtension("pg_trgm");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
