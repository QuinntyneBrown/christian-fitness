using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Notifications;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Notifications;

/// <summary>
/// <see cref="INotifier"/> over the database and the hub (ADR 0083): it stores the notification, drops the
/// member's notifications older than 30 days in the same save, then pushes the new one. The scheduler of
/// ADR 0069 is not built, so this is where expired notifications leave; reads ignore them meanwhile.
/// </summary>
internal sealed class Notifier(IAppDbContext db, INotificationChannel channel, TimeProvider time) : INotifier
{
    public async Task<NotificationDto?> NotifyAsync(NotificationRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var title = request.Title?.Trim() ?? string.Empty;
        var text = request.Text?.Trim() ?? string.Empty;
        if (title.Length == 0 || title.Length > Notification.TitleMaxLength)
        {
            throw new ArgumentException("A notification needs a title of at most 120 characters.", nameof(request));
        }

        if (text.Length > Notification.TextMaxLength)
        {
            throw new ArgumentException("A notification's text is at most 300 characters.", nameof(request));
        }

        if (!Notification.IsAppPath(request.Href))
        {
            throw new ArgumentException("A notification links to a path inside the app.", nameof(request));
        }

        if (!Enum.IsDefined(request.Kind))
        {
            throw new ArgumentException("Unknown notification kind.", nameof(request));
        }

        var known = await db.Members.AnyAsync(m => m.Id == request.MemberId, cancellationToken).ConfigureAwait(false);
        if (!known)
        {
            throw new ArgumentException("A notification is for a member.", nameof(request));
        }

        // A kind the member switched off is neither stored nor pushed (L2-064 AC10); with no row,
        // every kind is on.
        var preferences = await db.MemberPreferences.AsNoTracking()
            .SingleOrDefaultAsync(p => p.MemberId == request.MemberId, cancellationToken).ConfigureAwait(false);
        if (preferences is not null && !preferences.Allows(request.Kind))
        {
            return null;
        }

        var now = time.GetUtcNow();
        var keptSince = Notification.KeptSince(now);
        var expired = await db.Notifications
            .Where(n => n.MemberId == request.MemberId && n.CreatedAt <= keptSince)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        db.Notifications.RemoveRange(expired);
        var notification = Notification.Of(request.MemberId, request.Kind, title, text, request.Href, now);
        db.Notifications.Add(notification);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        var dto = NotificationDto.Of(notification);
        await channel.SendAsync(request.MemberId, dto, cancellationToken).ConfigureAwait(false);
        return dto;
    }
}
