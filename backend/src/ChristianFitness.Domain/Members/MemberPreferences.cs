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

    /// <summary>Who can open the member's profile (L2-065 AC1).</summary>
    public ProfileVisibility Visibility { get; private set; }

    /// <summary>Off: counted in "going" but not named or pictured to other members (L2-065 AC4).</summary>
    public bool ShowOnAttendeeLists { get; private set; }

    /// <summary>Off: only members who share a group may start a conversation (L2-065 AC5).</summary>
    public bool LetAnyoneMessage { get; private set; }

    /// <summary>The member's area, one of <see cref="SuggestionAreas.All"/>, or none until chosen (L2-065 AC6).</summary>
    public string? Area { get; private set; }

    /// <summary>
    /// A new member's preferences: every notification on (L2-064 AC4), the profile for Members, on
    /// attendee lists, and messages only from their groups (L2-065 AC1, AC5; ADR 0115).
    /// </summary>
    public static MemberPreferences DefaultsFor(Guid memberId) => new()
    {
        MemberId = memberId,
        EventReminders = true,
        Messages = true,
        FollowedListingDates = true,
        EventChanges = true,
        Visibility = ProfileVisibility.Members,
        ShowOnAttendeeLists = true,
        LetAnyoneMessage = false,
    };

    public void SetPrivacy(ProfileVisibility visibility, bool showOnAttendeeLists, bool letAnyoneMessage)
    {
        Visibility = visibility;
        ShowOnAttendeeLists = showOnAttendeeLists;
        LetAnyoneMessage = letAnyoneMessage;
    }

    public void SetArea(string? area) => Area = area;

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

/// <summary>Who can open a member's profile (L2-065 AC1): Members for a new member.</summary>
public enum ProfileVisibility
{
    /// <summary>Anyone, including people who are not signed in.</summary>
    Anyone,

    /// <summary>Anyone signed in.</summary>
    Members,

    /// <summary>People in the group chats the member is part of.</summary>
    JustMyGroups,
}

/// <summary>The eight areas a member chooses from (L2-065 AC6), by their codes.</summary>
public static class SuggestionAreas
{
    public static IReadOnlyList<string> All { get; } =
        ["toronto-east", "toronto-west", "downtown-toronto", "scarborough", "north-york", "mississauga", "brampton", "durham"];
}
