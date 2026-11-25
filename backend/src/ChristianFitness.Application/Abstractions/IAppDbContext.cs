using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Audit;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.News;
using ChristianFitness.Domain.Notifications;
using ChristianFitness.Domain.Services;
using ChristianFitness.Domain.Sessions;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Abstractions;

/// <summary>
/// The unit of work handlers depend on. Tests inject faults through it, since EF Core InMemory
/// raises none of the database's own (AGENTS.md, backend tests).
/// </summary>
public interface IAppDbContext
{
    DbSet<Member> Members { get; }

    DbSet<StaffRole> StaffRoles { get; }

    /// <summary>The reset links issued, by the hash of their token (L2-044; ADR 0010).</summary>
    DbSet<PasswordReset> PasswordResets { get; }
    /// <summary>Failed sign-ins of the last 15 minutes (L2-004 AC3; ADR 0012).</summary>
    DbSet<SignInFailure> SignInFailures { get; }

    /// <summary>The staff accounts' authenticator secrets (L2-046; ADR 0013).</summary>
    DbSet<StaffTwoStep> StaffTwoSteps { get; }

    /// <summary>The pending admin sign-ins, by the hash of their token (L2-046; ADR 0013).</summary>
    DbSet<TwoStepChallenge> TwoStepChallenges { get; }

    /// <summary>The wrong second-step codes, counted per account (L2-046 AC4; ADR 0013).</summary>
    DbSet<TwoStepFailure> TwoStepFailures { get; }

    /// <summary>The events staff create and members register for (L2-022; ADR 0021).</summary>
    DbSet<Event> Events { get; }

    /// <summary>The places members hold at events (L2-011; ADR 0032).</summary>
    DbSet<Registration> Registrations { get; }

    /// <summary>What members said in events' group chats (L2-016; ADR 0040).</summary>
    DbSet<ChatMessage> ChatMessages { get; }

    /// <summary>How far each member has read each event chat (L2-016 AC7; ADR 0042).</summary>
    DbSet<ChatReadMarker> ChatReadMarkers { get; }

    /// <summary>What two members said to each other privately (L2-016; ADR 0043).</summary>
    DbSet<DirectMessage> DirectMessages { get; }

    /// <summary>The messages members reported for staff to review (L2-017; ADR 0000).</summary>
    DbSet<MessageReport> MessageReports { get; }

    /// <summary>What staff changed: who, what, which record and when (L2-019 AC3; ADR 0023).</summary>
    DbSet<AuditEntry> AuditEntries { get; }

    /// <summary>The requests to be listed on Services (L2-026; ADR 0048).</summary>
    DbSet<ProfessionalApplication> ProfessionalApplications { get; }

    /// <summary>The professionals published on Services (L2-025 AC2; ADR 0050).</summary>
    DbSet<ServiceListing> ServiceListings { get; }

    /// <summary>The members' in-app notifications (ADR 0068, ADR 0083).</summary>
    DbSet<Notification> Notifications { get; }

    /// <summary>The directory's listings, published or waiting for staff's check (L2-054; ADR 0082).</summary>
    DbSet<DirectoryListing> DirectoryListings { get; }

    /// <summary>The listings members suggested, waiting for staff's review (L2-062; ADR 0086).</summary>
    DbSet<ListingSuggestion> ListingSuggestions { get; }

    /// <summary>Each listing's relation to another, worded from its side (L2-055 AC4; ADR 0087).</summary>
    DbSet<ListingConnection> ListingConnections { get; }

    /// <summary>Each member's follows and unfollows of the last hour, counted against 60 (L2-056 AC9; ADR 0088).</summary>
    DbSet<ListingFollowChange> ListingFollowChanges { get; }

    /// <summary>Which members follow which directory listings (L2-056; ADR 0088).</summary>
    DbSet<ListingFollow> ListingFollows { get; }

    /// <summary>The checks staff set on a suggestion (L2-073 AC4; ADR 0090).</summary>
    DbSet<SuggestionCheck> SuggestionChecks { get; }

    /// <summary>The links to claim an approved listing (L2-078; ADR 0090).</summary>
    DbSet<ListingClaim> ListingClaims { get; }

    /// <summary>The series staff run, each a program of dated session events (L2-071; ADR 0080, ADR 0091).</summary>
    DbSet<EventSeries> EventSeries { get; }

    /// <summary>The members who joined each series (ADR 0091; joining comes with journey 12).</summary>
    DbSet<SeriesEnrolment> SeriesEnrolments { get; }

    /// <summary>The names stories run under, which Admins manage (L2-077; ADR 0093).</summary>
    DbSet<Byline> Bylines { get; }

    /// <summary>The stories Admins write; for now only each one's byline (ADR 0093).</summary>
    DbSet<Story> Stories { get; }

    /// <summary>Whether the database answers; the readiness check asks this.</summary>
    Task<bool> CanConnectAsync(CancellationToken cancellationToken);

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
