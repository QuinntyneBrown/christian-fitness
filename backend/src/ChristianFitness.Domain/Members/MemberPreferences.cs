using ChristianFitness.Domain.Notifications;

namespace ChristianFitness.Domain.Members;

/// <summary>
/// What one member chose on Preferences (L2-064): which kinds of notification they get. One row per
/// member, deleted with the member; a member with no row has the defaults, every switch on, so
/// existing members need no backfill. The email switches are the newsletter subscription of the
/// account's address, not kept here.
/// </summary>
public sealed class MemberPreferences
{
    private MemberPreferences()
    {
    }

    public Guid MemberId { get; private set; }

    public bool EventReminders { get; private set; }

    /// <summary>Kept for when messages notify; no notification kind reads it yet.</summary>
    public bool Messages { get; private set; }

    public bool FollowedListingDates { get; private set; }

    public bool EventChanges { get; private set; }

    /// <summary>A new member's preferences: every notification on (L2-064 AC4).</summary>
    public static MemberPreferences DefaultsFor(Guid memberId) =>
        new() { MemberId = memberId, EventReminders = true, Messages = true, FollowedListingDates = true, EventChanges = true };

    public void SetNotifications(bool eventReminders, bool messages, bool followedListingDates, bool eventChanges)
    {
        EventReminders = eventReminders;
        Messages = messages;
        FollowedListingDates = followedListingDates;
        EventChanges = eventChanges;
    }

    /// <summary>Whether a notification of <paramref name="kind"/> may be shown or sent (L2-064 AC10).</summary>
    public bool Allows(NotificationKind kind) => kind switch
    {
        NotificationKind.EventReminder => EventReminders,
        NotificationKind.FollowedHostDates => FollowedListingDates,
        NotificationKind.EventCancelled or NotificationKind.SeriesDateCancelled => EventChanges,
        _ => true,
    };
}
