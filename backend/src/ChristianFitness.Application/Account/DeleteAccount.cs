using System.Globalization;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Chat;
using ChristianFitness.Application.Email;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Account;

/// <summary>
/// "Delete my account" in the Delete your account dialog (L2-066 AC5, AC6, AC9 to AC11; ADR 0078,
/// ADR 0118), audited with the member as actor. <paramref name="Confirm"/> is the word they typed.
/// </summary>
public sealed record DeleteAccountCommand(string? Confirm) : IRequest, IAuditableCommand
{
    public string AuditAction => "account.deletion_requested";
}

/// <summary>
/// In order:
/// <list type="number">
/// <item>with five attempts by the member in the last hour, the attempt is refused 429
/// <c>too_many_attempts</c> and not counted (AC11);</item>
/// <item>otherwise the attempt is saved at once, whatever follows, so invalid and refused ones count;</item>
/// <item>anything but the word is refused 400 <c>validation_failed</c> (AC5);</item>
/// <item>a staff account is refused 403 <c>staff_account</c> (AC9);</item>
/// <item>otherwise, in one unit of work, the account is marked deleting, its places at events not
/// started go back, it leaves every series, the account's subscription is unsubscribed, its reset
/// links and data archives are deleted and every session it has is ended (AC6). Then its open
/// connections leave every chat and the member is emailed the day of erasure.</item>
/// </list>
/// It logs nothing (AC10).
/// </summary>
internal sealed class DeleteAccountHandler(
    IAppDbContext db,
    ICurrentMember current,
    AuditTrail audit,
    ISessionRevocation sessions,
    ISessionSignIn session,
    IChatChannel chat,
    IArchiveStore archives,
    IEmailSender email,
    MemberAppAddress app,
    TimeProvider time) : IRequestHandler<DeleteAccountCommand>
{
    public const string Subject = "Your Christian Fitness account is set to be deleted";

    public async Task Handle(DeleteAccountCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var id = current.Id;
        var now = time.GetUtcNow();
        await CountAttemptAsync(id, now, cancellationToken).ConfigureAwait(false);
        if (!AccountDeletionAttempt.Confirms(request.Confirm))
        {
            throw new RefusalException(RefusalCodes.ValidationFailed, RefusalKind.BadRequest);
        }

        if (await db.StaffRoles.AnyAsync(r => r.MemberId == id, cancellationToken).ConfigureAwait(false))
        {
            throw new RefusalException(RefusalCodes.StaffAccount, RefusalKind.Forbidden);
        }

        var member = await db.Members.SingleAsync(m => m.Id == id, cancellationToken).ConfigureAwait(false);
        member.RequestDeletion(now);
        await GiveBackPlacesAsync(id, now, cancellationToken).ConfigureAwait(false);
        var subscription = await db.NewsletterSubscriptions
            .SingleOrDefaultAsync(s => s.Email == member.NormalizedEmail, cancellationToken).ConfigureAwait(false);
        subscription?.Unsubscribe(now);
        db.PasswordResets.RemoveRange(await db.PasswordResets.Where(r => r.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false));
        var exports = await db.DataExportRequests.Where(r => r.MemberId == id).ToListAsync(cancellationToken).ConfigureAwait(false);
        db.DataExportRequests.RemoveRange(exports);
        await sessions.EndAllAsync(id, cancellationToken).ConfigureAwait(false);
        audit.Record(id, nameof(Member), id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        foreach (var key in exports.Select(r => r.ArchiveKey).OfType<string>())
        {
            await archives.DeleteAsync(key, cancellationToken).ConfigureAwait(false);
        }

        await session.SignOutAsync().ConfigureAwait(false);
        await chat.LeaveAllAsync(id, cancellationToken).ConfigureAwait(false);
        await email.SendAsync(new EmailMessage(member.Email, Subject, Text(member.Name, app.SignInLink(), member.ErasesAt!.Value)), cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Refuses a sixth attempt in the hour, else saves this one and forgets the member's older ones.</summary>
    private async Task CountAttemptAsync(Guid id, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var since = AccountDeletionAttempt.Window.Since(now);
        var recent = await db.AccountDeletionAttempts.CountAsync(a => a.MemberId == id && a.AttemptedAt > since, cancellationToken).ConfigureAwait(false);
        if (AccountDeletionAttempt.Window.IsFull(recent))
        {
            throw new RefusalException(RefusalCodes.TooManyAttempts, RefusalKind.TooManyRequests);
        }

        db.AccountDeletionAttempts.RemoveRange(await db.AccountDeletionAttempts
            .Where(a => a.MemberId == id && a.AttemptedAt <= since).ToListAsync(cancellationToken).ConfigureAwait(false));
        db.AccountDeletionAttempts.Add(AccountDeletionAttempt.Of(id, now));
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Removes the member's places at events and series sessions that have not started, each event
    /// releasing one, and their enrolment in every series, each series withdrawing one (ADR 0101).
    /// Places at started events stay in their history until erasure.
    /// </summary>
    private async Task GiveBackPlacesAsync(Guid id, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var places = await db.Registrations
            .Where(r => r.MemberId == id)
            .Join(db.Events.Where(e => e.StartsAt > now), r => r.EventId, e => e.Id, (r, e) => new { Place = r, Event = e })
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        foreach (var held in places)
        {
            held.Event.ReleasePlace();
            db.Registrations.Remove(held.Place);
        }

        var enrolments = await db.SeriesEnrolments
            .Where(x => x.MemberId == id)
            .Join(db.EventSeries, x => x.SeriesId, s => s.Id, (x, s) => new { Enrolment = x, Series = s })
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        foreach (var joined in enrolments)
        {
            joined.Series.Withdraw();
            db.SeriesEnrolments.Remove(joined.Enrolment);
        }
    }

    /// <summary>The words of mock <c>email-deletion-requested</c>, with the day of erasure in Toronto.</summary>
    private static string Text(string name, string link, DateTimeOffset erasesAt)
    {
        var first = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        var on = EventSchedule.TorontoOf(erasesAt).Date.ToString("MMMM d, yyyy", CultureInfo.InvariantCulture);
        return $"""
            Hi {(string.IsNullOrEmpty(first) ? "there" : first)},

            You asked us to delete your account. Your profile is hidden from everyone now, and you're signed out everywhere.

            On {on} we'll erase your profile, preferences, follows, registrations, suggestions, feedback and the text of your messages. Places you held at events have gone back to other members, and they aren't restored.

            Changed your mind? Sign in before {on} and choose Restore my account.

            Restore my account: {link}

            {Organisation.Name}

            If you didn't ask for this, restore your account and change your password, or write to {Organisation.PrivacyEmail}.
            """;
    }
}
