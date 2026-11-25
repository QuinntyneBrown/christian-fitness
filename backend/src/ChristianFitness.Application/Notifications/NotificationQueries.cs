using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Notifications;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Notifications;

/// <summary>
/// The caller's inbox (ADR 0083): their newest 50 notifications of the last 30 days, newest first, and how
/// many of those 30 days are unread (which can be more than 50).
/// </summary>
public sealed record ListNotificationsQuery : IRequest<NotificationListDto>;

internal sealed class ListNotificationsHandler(IAppDbContext db, ICurrentMember current, TimeProvider time)
    : IRequestHandler<ListNotificationsQuery, NotificationListDto>
{
    /// <summary>The most notifications listed (ADR 0068).</summary>
    public const int Limit = 50;

    public async Task<NotificationListDto> Handle(ListNotificationsQuery request, CancellationToken cancellationToken)
    {
        var keptSince = Notification.KeptSince(time.GetUtcNow());
        var mine = db.Notifications.AsNoTracking().Where(n => n.MemberId == current.Id && n.CreatedAt > keptSince);
        var latest = await mine
            .OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id)
            .Take(Limit)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        var unread = await mine.CountAsync(n => n.ReadAt == null, cancellationToken).ConfigureAwait(false);
        return new NotificationListDto([.. latest.Select(NotificationDto.Of)], unread);
    }
}

/// <summary>Marks every unread notification of the caller read (ADR 0083, "Mark all as read").</summary>
public sealed record MarkNotificationsReadCommand : IRequest;

internal sealed class MarkNotificationsReadHandler(IAppDbContext db, ICurrentMember current, TimeProvider time)
    : IRequestHandler<MarkNotificationsReadCommand>
{
    public async Task Handle(MarkNotificationsReadCommand request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var unread = await db.Notifications
            .Where(n => n.MemberId == current.Id && n.ReadAt == null)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        foreach (var notification in unread)
        {
            notification.MarkRead(now);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
