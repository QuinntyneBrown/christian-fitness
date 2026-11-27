using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Email;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Account;

/// <summary>
/// The scheduler's erasure job (L2-066 AC7, AC8; ADR 0078, ADR 0118), run on every tick: each account
/// deleting for 30 days or more, oldest first and at most <see cref="EraseAccountsHandler.BatchSize"/>
/// a tick, is erased in one unit of work, then its address is told once. Answers how many it erased;
/// nothing it reads reaches a log or a span.
/// </summary>
public sealed record EraseAccountsCommand : IRequest<int>;

/// <summary>
/// What erasure does to one member (ADR 0078's table): the <c>Member</c> row and everything only
/// they own are deleted (preferences, follows, views, notifications, registrations, attendance,
/// series places, reset links, attempts, archives, suggestions and their checks, feedback with its
/// replies and screenshots, professional applications and listings, the account's subscription
/// with its tokens, the photo), so the email is free to join as new. What others keep is detached:
/// the member's sent messages are emptied in place under an id that names nobody, received direct
/// messages, others' read markers and message reports point at that id, a listing they own is
/// owned by nobody and audit entries lose the member's id.
/// </summary>
internal sealed class EraseAccountsHandler(
    IAppDbContext db,
    ISessionRevocation sessions,
    IArchiveStore archives,
    IImageStore images,
    IFeedbackScreenshotStore screenshots,
    IEmailSender email,
    TimeProvider time) : IRequestHandler<EraseAccountsCommand, int>
{
    /// <summary>How many accounts one tick erases; the rest wait 30 seconds for the next.</summary>
    public const int BatchSize = 10;

    public const string Subject = "Your Christian Fitness account has been deleted";

    public async Task<int> Handle(EraseAccountsCommand request, CancellationToken cancellationToken)
    {
        var due = time.GetUtcNow() - Member.DeletionGracePeriod;
        var members = await db.Members
            .Where(m => m.DeletionRequestedAt != null && m.DeletionRequestedAt <= due)
            .OrderBy(m => m.DeletionRequestedAt)
            .Take(BatchSize)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        foreach (var member in members)
        {
            var files = await EraseAsync(member, cancellationToken).ConfigureAwait(false);
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            await files.DeleteAsync(archives, images, screenshots, cancellationToken).ConfigureAwait(false);
            await email.SendAsync(new EmailMessage(member.Email, Subject, Text(member.Name)), cancellationToken).ConfigureAwait(false);
        }

        return members.Count;
    }

    /// <summary>Stages the member's erasure in the unit of work and answers the files to remove once it is saved.</summary>
    private async Task<Files> EraseAsync(Member member, CancellationToken cancellationToken)
    {
        var id = member.Id;
        var formerId = Guid.NewGuid();

        foreach (var message in await db.ChatMessages.Where(m => m.AuthorId == id).ToListAsync(cancellationToken).ConfigureAwait(false))
        {
            message.Erase(formerId);
        }

        foreach (var message in await db.DirectMessages.Where(m => m.SenderId == id || m.RecipientId == id).ToListAsync(cancellationToken).ConfigureAwait(false))
        {
            if (message.SenderId == id)
            {
                message.EraseSent(formerId);
            }
            else
            {
                message.DetachRecipient(formerId);
            }
        }

        // Others' markers of their conversation with the member move to the id that names nobody;
        // the member's own markers go with them.
        var markers = await db.ChatReadMarkers.Where(k => k.MemberId == id || k.ScopeId == id).ToListAsync(cancellationToken).ConfigureAwait(false);
        db.ChatReadMarkers.RemoveRange(markers);
        db.ChatReadMarkers.AddRange(markers.Where(k => k.MemberId != id).Select(k => ChatReadMarker.Of(k.MemberId, formerId, k.ReadAt)));

        foreach (var report in await db.MessageReports.Where(r => r.ReporterId == id || r.SenderId == id).ToListAsync(cancellationToken).ConfigureAwait(false))
        {
            report.Detach(id, formerId);
        }

        foreach (var entry in await db.AuditEntries.Where(a => a.ActorMemberId == id || a.RecordId == id).ToListAsync(cancellationToken).ConfigureAwait(false))
        {
            entry.Detach(id);
        }

        foreach (var listing in await db.DirectoryListings.Where(l => l.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false))
        {
            listing.ReleaseOwner();
        }

        db.Registrations.RemoveRange(await db.Registrations.Where(r => r.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.Attendances.RemoveRange(await db.Attendances.Where(a => a.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.SeriesEnrolments.RemoveRange(await db.SeriesEnrolments.Where(x => x.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.MemberPreferences.RemoveRange(await db.MemberPreferences.Where(p => p.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.ListingFollows.RemoveRange(await db.ListingFollows.Where(f => f.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.ListingFollowChanges.RemoveRange(await db.ListingFollowChanges.Where(c => c.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.EventViews.RemoveRange(await db.EventViews.Where(v => v.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.Notifications.RemoveRange(await db.Notifications.Where(n => n.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.PasswordResets.RemoveRange(await db.PasswordResets.Where(r => r.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.AccountDeletionAttempts.RemoveRange(await db.AccountDeletionAttempts.Where(a => a.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false));

        var suggestions = await db.ListingSuggestions.Where(s => s.SuggestedById == id).ToListAsync(cancellationToken).ConfigureAwait(false);
        var suggestionIds = suggestions.Select(s => s.Id).ToList();
        db.SuggestionChecks.RemoveRange(await db.SuggestionChecks.Where(c => suggestionIds.Contains(c.SuggestionId)).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.ListingSuggestions.RemoveRange(suggestions);

        var notes = await db.FeedbackNotes.Where(n => n.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false);
        var noteIds = notes.Select(n => n.Id).ToList();
        db.FeedbackReplies.RemoveRange(await db.FeedbackReplies.Where(r => noteIds.Contains(r.NoteId)).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.FeedbackNotes.RemoveRange(notes);

        db.ServiceListings.RemoveRange(await db.ServiceListings.Where(l => l.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.ProfessionalApplications.RemoveRange(await db.ProfessionalApplications.Where(a => a.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false));

        var exports = await db.DataExportRequests.Where(r => r.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false);
        db.DataExportRequests.RemoveRange(exports);

        var subscriptions = await db.NewsletterSubscriptions.Where(s => s.Email == member.NormalizedEmail).ToListAsync(cancellationToken).ConfigureAwait(false);
        var subscriptionIds = subscriptions.Select(s => s.Id).ToList();
        db.NewsletterUnsubscribeTokens.RemoveRange(await db.NewsletterUnsubscribeTokens.Where(t => subscriptionIds.Contains(t.SubscriptionId)).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.SubscriptionConfirmations.RemoveRange(await db.SubscriptionConfirmations.Where(c => subscriptionIds.Contains(c.SubscriptionId)).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.IssueDeliveries.RemoveRange(await db.IssueDeliveries.Where(d => subscriptionIds.Contains(d.SubscriptionId)).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.NewsletterSubscriptions.RemoveRange(subscriptions);

        await sessions.EndAllAsync(id, cancellationToken).ConfigureAwait(false);
        db.Members.Remove(member);
        return new Files(
            [.. exports.Select(r => r.ArchiveKey).OfType<string>()],
            member.PhotoKey,
            [.. notes.Select(n => n.ScreenshotKey).OfType<string>()]);
    }

    /// <summary>The words of mock <c>email-deletion-done</c>.</summary>
    private static string Text(string name)
    {
        var first = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        return $"""
            Hi {(string.IsNullOrEmpty(first) ? "there" : first)},

            Your account is deleted. We've erased your profile, preferences, follows, registrations, suggestions, feedback and the text of your messages.

            You're welcome back any time. You can join again with this email address as a new member. This is the last email we'll send to this address about your account.

            {Organisation.Name}

            Questions? Write to {Organisation.PrivacyEmail}.
            """;
    }

    /// <summary>The files an erased member leaves, removed once the erasure is saved.</summary>
    private sealed record Files(IReadOnlyList<string> Archives, string? Photo, IReadOnlyList<string> Screenshots)
    {
        public async Task DeleteAsync(IArchiveStore archives, IImageStore images, IFeedbackScreenshotStore screenshots, CancellationToken cancellationToken)
        {
            foreach (var key in Archives)
            {
                await archives.DeleteAsync(key, cancellationToken).ConfigureAwait(false);
            }

            if (Photo is not null)
            {
                await images.DeleteAsync(Photo, cancellationToken).ConfigureAwait(false);
            }

            foreach (var key in Screenshots)
            {
                await screenshots.DeleteAsync(key, cancellationToken).ConfigureAwait(false);
            }
        }
    }
}
