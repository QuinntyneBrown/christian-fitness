using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Newsletter;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Preferences;

/// <summary>The signed-in member's preferences (L2-064 AC2, AC4): their name, the four emails and the four notification switches.</summary>
public sealed record GetPreferencesQuery : IRequest<PreferencesDto>;

public sealed record PreferencesDto(string Name, EmailPreferencesDto Email, NotificationPreferencesDto Notifications);

/// <summary>The Abundant Weekly and its three extras, as the account's own address is subscribed.</summary>
public sealed record EmailPreferencesDto(bool Weekly, bool EventAlerts, bool TrainingPlan, bool Devotion);

public sealed record NotificationPreferencesDto(bool EventReminders, bool Messages, bool FollowedListingDates, bool EventChanges);

/// <summary>
/// Save on Preferences (L2-064 AC6, AC8): every setting on the page, kept together in one save or not
/// at all. It is the member's own choice, not a staff change, so it is not audited; no log, metric or
/// span carries a value of it (L2-065 AC9).
/// </summary>
public sealed record SavePreferencesCommand(EmailPreferencesDto? Email, NotificationPreferencesDto? Notifications) : IRequest<PreferencesDto>;

internal static class PreferencesReader
{
    public static async Task<PreferencesDto> ReadAsync(IAppDbContext db, Guid memberId, CancellationToken cancellationToken)
    {
        var member = await db.Members.AsNoTracking()
            .Where(m => m.Id == memberId)
            .Select(m => new { m.Name, m.NormalizedEmail })
            .SingleAsync(cancellationToken).ConfigureAwait(false);
        var preferences = await db.MemberPreferences.AsNoTracking().SingleOrDefaultAsync(p => p.MemberId == memberId, cancellationToken).ConfigureAwait(false)
            ?? MemberPreferences.DefaultsFor(memberId);
        var address = NewsletterSubscription.Normalize(member.NormalizedEmail);
        var subscription = await db.NewsletterSubscriptions.AsNoTracking()
            .SingleOrDefaultAsync(s => s.Email == address, cancellationToken).ConfigureAwait(false);
        // Only a Subscribed address gets email: Pending and Unsubscribed read as every switch off (AC9).
        var on = subscription is { Status: SubscriptionStatus.Subscribed };
        return new PreferencesDto(
            member.Name,
            new EmailPreferencesDto(on && subscription!.Weekly, on && subscription!.EventAlerts, on && subscription!.TrainingPlan, on && subscription!.Devotion),
            new NotificationPreferencesDto(preferences.EventReminders, preferences.Messages, preferences.FollowedListingDates, preferences.EventChanges));
    }
}

internal sealed class GetPreferencesHandler(IAppDbContext db, ICurrentMember current) : IRequestHandler<GetPreferencesQuery, PreferencesDto>
{
    public Task<PreferencesDto> Handle(GetPreferencesQuery request, CancellationToken cancellationToken) =>
        PreferencesReader.ReadAsync(db, current.Id, cancellationToken);
}

internal sealed class SavePreferencesHandler(IAppDbContext db, ICurrentMember current, TimeProvider time) : IRequestHandler<SavePreferencesCommand, PreferencesDto>
{
    public async Task<PreferencesDto> Handle(SavePreferencesCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var now = time.GetUtcNow();
        if (request.Notifications is { } notifications)
        {
            var preferences = await db.MemberPreferences.SingleOrDefaultAsync(p => p.MemberId == current.Id, cancellationToken).ConfigureAwait(false);
            if (preferences is null)
            {
                preferences = MemberPreferences.DefaultsFor(current.Id);
                db.MemberPreferences.Add(preferences);
            }

            preferences.SetNotifications(notifications.EventReminders, notifications.Messages, notifications.FollowedListingDates, notifications.EventChanges);
        }

        if (request.Email is { } email)
        {
            var address = NewsletterSubscription.Normalize(
                await db.Members.AsNoTracking().Where(m => m.Id == current.Id).Select(m => m.NormalizedEmail).SingleAsync(cancellationToken).ConfigureAwait(false));
            var subscription = await db.NewsletterSubscriptions.SingleOrDefaultAsync(s => s.Email == address, cancellationToken).ConfigureAwait(false);
            var any = email.Weekly || email.EventAlerts || email.TrainingPlan || email.Devotion;
            if (subscription is null && any)
            {
                subscription = NewsletterSubscription.ForAccount(address, now);
                db.NewsletterSubscriptions.Add(subscription);
            }

            subscription?.SetEmails(email.Weekly, email.EventAlerts, email.TrainingPlan, email.Devotion, now);
        }

        // One save: every changed setting is kept together or none is (L2-064 AC6).
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return await PreferencesReader.ReadAsync(db, current.Id, cancellationToken).ConfigureAwait(false);
    }
}
