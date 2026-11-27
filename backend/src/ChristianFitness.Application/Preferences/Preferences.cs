using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Newsletter;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Preferences;

/// <summary>The signed-in member's preferences (L2-064 AC2, AC4): their name, the four emails and the four notification switches.</summary>
public sealed record GetPreferencesQuery : IRequest<PreferencesDto>;

public sealed record PreferencesDto(
    string Name,
    EmailPreferencesDto Email,
    NotificationPreferencesDto Notifications,
    PrivacyPreferencesDto Privacy,
    SuggestionPreferencesDto Suggestions);

/// <summary>
/// Who sees the member (L2-065 AC1, AC4, AC5, AC10): <c>anyone</c>, <c>members</c> or <c>groups</c>;
/// whether their home church shows, whether they are named on attendee lists, and whether anyone
/// may message them.
/// </summary>
public sealed record PrivacyPreferencesDto(string? Visibility, bool ShowHomeChurch, bool ShowOnAttendeeLists, bool LetAnyoneMessage);

/// <summary>What orders Home's suggestions (L2-065 AC6, AC7): the member's area, or none, and their interests.</summary>
public sealed record SuggestionPreferencesDto(string? Area, IReadOnlyList<string>? Interests);

/// <summary>The names of the visibilities, and the field codes Preferences refuses with.</summary>
public static class PreferenceRules
{
    public static readonly IReadOnlySet<string> FieldCodes = new HashSet<string>(StringComparer.Ordinal)
    {
        "visibility_invalid", "area_invalid", "interest_invalid",
    };

    private static readonly Dictionary<string, ProfileVisibility> Visibilities = new(StringComparer.Ordinal)
    {
        ["anyone"] = ProfileVisibility.Anyone,
        ["members"] = ProfileVisibility.Members,
        ["groups"] = ProfileVisibility.JustMyGroups,
    };

    public static ProfileVisibility? VisibilityOf(string? name) => name is not null && Visibilities.TryGetValue(name, out var v) ? v : null;

    public static string Of(ProfileVisibility visibility) => Visibilities.Single(p => p.Value == visibility).Key;
}

/// <summary>The Abundant Weekly and its three extras, as the account's own address is subscribed.</summary>
public sealed record EmailPreferencesDto(bool Weekly, bool EventAlerts, bool TrainingPlan, bool Devotion);

public sealed record NotificationPreferencesDto(bool EventReminders, bool Messages, bool FollowedListingDates, bool EventChanges);

/// <summary>
/// Save on Preferences (L2-064 AC6, AC8): every setting on the page, kept together in one save or not
/// at all. It is the member's own choice, not a staff change, so it is not audited; no log, metric or
/// span carries a value of it (L2-065 AC9).
/// </summary>
public sealed record SavePreferencesCommand(
    EmailPreferencesDto? Email,
    NotificationPreferencesDto? Notifications,
    PrivacyPreferencesDto? Privacy = null,
    SuggestionPreferencesDto? Suggestions = null) : IRequest<PreferencesDto>;

/// <summary>A visibility, an area or an interest that is not on its list is refused, naming the field (L2-065 AC1, AC6).</summary>
internal sealed class SavePreferencesValidator : AbstractValidator<SavePreferencesCommand>
{
    public SavePreferencesValidator()
    {
        RuleFor(c => c.Privacy!.Visibility)
            .Must(name => PreferenceRules.VisibilityOf(name) is not null)
            .When(c => c.Privacy is not null)
            .OverridePropertyName("privacy.visibility")
            .WithErrorCode("visibility_invalid").WithMessage("Choose who can see your profile");
        RuleFor(c => c.Suggestions!.Area)
            .Must(area => area is null || SuggestionAreas.All.Contains(area, StringComparer.Ordinal))
            .When(c => c.Suggestions is not null)
            .OverridePropertyName("suggestions.area")
            .WithErrorCode("area_invalid").WithMessage("Choose an area from the list");
        RuleFor(c => c.Suggestions!.Interests)
            .Must(interests => (interests ?? []).All(key => Interests.All.Contains(key, StringComparer.Ordinal)))
            .When(c => c.Suggestions is not null)
            .OverridePropertyName("suggestions.interests")
            .WithErrorCode("interest_invalid").WithMessage("Choose interests from the list");
    }
}

internal static class PreferencesReader
{
    public static async Task<PreferencesDto> ReadAsync(IAppDbContext db, Guid memberId, CancellationToken cancellationToken)
    {
        var member = await db.Members.AsNoTracking()
            .Where(m => m.Id == memberId)
            .Select(m => new { m.Name, m.NormalizedEmail, m.Interests, m.ShowHomeChurch })
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
            new NotificationPreferencesDto(preferences.EventReminders, preferences.Messages, preferences.FollowedListingDates, preferences.EventChanges),
            new PrivacyPreferencesDto(PreferenceRules.Of(preferences.Visibility), member.ShowHomeChurch, preferences.ShowOnAttendeeLists, preferences.LetAnyoneMessage),
            new SuggestionPreferencesDto(preferences.Area, member.Interests));
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
        var preferences = await db.MemberPreferences.SingleOrDefaultAsync(p => p.MemberId == current.Id, cancellationToken).ConfigureAwait(false);
        if (preferences is null)
        {
            preferences = MemberPreferences.DefaultsFor(current.Id);
            db.MemberPreferences.Add(preferences);
        }

        if (request.Notifications is { } notifications)
        {
            preferences.SetNotifications(notifications.EventReminders, notifications.Messages, notifications.FollowedListingDates, notifications.EventChanges);
        }

        if (request.Privacy is { } privacy)
        {
            preferences.SetPrivacy(PreferenceRules.VisibilityOf(privacy.Visibility)!.Value, privacy.ShowOnAttendeeLists, privacy.LetAnyoneMessage);
        }

        if (request.Suggestions is { } suggestions)
        {
            preferences.SetArea(suggestions.Area);
        }

        if (request.Privacy is not null || request.Suggestions is not null)
        {
            // The interests and the home church's switch are the profile's own (L2-065 AC7, AC10).
            var member = await db.Members.SingleAsync(m => m.Id == current.Id, cancellationToken).ConfigureAwait(false);
            member.ChangeFromPreferences(request.Suggestions?.Interests ?? (request.Suggestions is null ? null : []), request.Privacy?.ShowHomeChurch);
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
