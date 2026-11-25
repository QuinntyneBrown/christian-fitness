using ChristianFitness.Domain.Notifications;

namespace ChristianFitness.Application.Notifications;

/// <summary>
/// What a sender asks for (ADR 0083): one notification of <see cref="Kind"/> for <see cref="MemberId"/>,
/// with a plain-text title and line of detail and the app-relative path it links to.
/// </summary>
public sealed record NotificationRequest(Guid MemberId, NotificationKind Kind, string Title, string Text, string Href);

/// <summary>
/// One notification as the member's client receives it, listed or pushed. <see cref="Kind"/> is
/// <c>event-reminder</c>, <c>event-cancelled</c>, <c>series-date-cancelled</c> or <c>followed-host-dates</c>.
/// </summary>
public sealed record NotificationDto(Guid Id, string Kind, string Title, string Text, string Href, DateTimeOffset CreatedAt, bool Read)
{
    public static NotificationDto Of(Notification notification)
    {
        ArgumentNullException.ThrowIfNull(notification);
        return new(notification.Id, KindName(notification.Kind), notification.Title, notification.Text, notification.Href,
            notification.CreatedAt, notification.ReadAt is not null);
    }

    /// <summary>The wire name of a kind.</summary>
    public static string KindName(NotificationKind kind) => kind switch
    {
        NotificationKind.EventReminder => "event-reminder",
        NotificationKind.EventCancelled => "event-cancelled",
        NotificationKind.SeriesDateCancelled => "series-date-cancelled",
        NotificationKind.FollowedHostDates => "followed-host-dates",
        _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, "Unknown notification kind."),
    };
}

/// <summary>The member's newest 50 notifications of the last 30 days, and how many of those 30 days are unread.</summary>
public sealed record NotificationListDto(IReadOnlyList<NotificationDto> Notifications, int Unread);

/// <summary>
/// The one way to notify a member (ADR 0083). It checks the request, stores the notification, drops that
/// member's expired ones and pushes it to the member's connections. Journey 33 adds the preference check
/// (<c>MemberPreferences.Allows</c>) here, so no sender reads preferences itself.
/// </summary>
public interface INotifier
{
    /// <summary>
    /// Notifies the member and answers what was stored. A request that is not well formed (an unknown
    /// member, an empty or too long title, too long a text, a path that is not inside the app) throws
    /// <see cref="ArgumentException"/>: senders are the application's own code.
    /// </summary>
    Task<NotificationDto> NotifyAsync(NotificationRequest request, CancellationToken cancellationToken);
}

/// <summary>Where a notification goes live; the API implements it over the hub (ADR 0083).</summary>
public interface INotificationChannel
{
    /// <summary>Delivers the notification to every connection of the member as <c>NotificationReceived</c>.</summary>
    Task SendAsync(Guid memberId, NotificationDto notification, CancellationToken cancellationToken);
}
