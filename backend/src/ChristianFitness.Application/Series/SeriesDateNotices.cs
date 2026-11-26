using System.Globalization;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Chat;
using ChristianFitness.Application.Notifications;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Notifications;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Series;

/// <summary>
/// How members are told that a series date was cancelled or restored (L2-071 AC4, AC5; L2-052
/// AC10; ADR 0103): a notice in the series chat from the Christian Fitness account (ADR 0090),
/// added in the caller's unit of work and pushed once saved, and on a cancel a "Cancelled series
/// date" notification to each member holding a place. Logs nothing: no text, no member.
/// </summary>
internal sealed class SeriesDateNotices(IAppDbContext db, IChatChannel chat, INotifier notifier, TimeProvider time)
{
    private ChatMessage? _added;

    /// <summary>"Tue, May 5" in Toronto.</summary>
    public static string DayOf(DateTimeOffset startsAt) =>
        EventSchedule.TorontoOf(startsAt).Date.ToString("ddd, MMM d", CultureInfo.InvariantCulture);

    /// <summary>Adds the chat notice for the change to <paramref name="session"/>, unless the Christian Fitness account is not seeded.</summary>
    public async Task AddNoticeAsync(Event session, bool cancelled, CancellationToken cancellationToken)
    {
        var system = await db.Members.AsNoTracking().AnyAsync(m => m.Id == SystemMembers.ChristianFitnessId, cancellationToken).ConfigureAwait(false);
        if (!system)
        {
            return;
        }

        var day = DayOf(session.StartsAt);
        var text = cancelled
            ? $"{day} is cancelled. The other dates in the series stand."
            : $"{day} is back on. If you held a place, it is yours again.";
        _added = ChatMessage.Of(ChatScope.Of(session), SystemMembers.ChristianFitnessId, text, time.GetUtcNow());
        db.ChatMessages.Add(_added);
    }

    /// <summary>Pushes the notice added, after the caller saved it.</summary>
    public async Task PushNoticeAsync(CancellationToken cancellationToken)
    {
        if (_added is null)
        {
            return;
        }

        var dto = new ChatMessageDto(_added.Id, _added.ScopeId, _added.AuthorId, SystemMembers.ChristianFitnessName, _added.Text, _added.SentAt);
        await chat.SendAsync(new ChatScope(_added.ScopeKind, _added.ScopeId), dto, cancellationToken).ConfigureAwait(false);
        _added = null;
    }

    /// <summary>Sends each of <paramref name="members"/> a "Cancelled series date" notification for <paramref name="session"/> of <paramref name="series"/>.</summary>
    public async Task NotifyCancelledAsync(EventSeries series, Event session, IEnumerable<Guid> members, CancellationToken cancellationToken)
    {
        var title = $"Cancelled date: {series.Title}";
        if (title.Length > Notification.TitleMaxLength)
        {
            title = string.Concat(title.AsSpan(0, Notification.TitleMaxLength - 1), "…");
        }

        var text = $"{DayOf(session.StartsAt)} is off; the other dates in the series stand.";
        var href = $"/events/series/{series.Id}";
        foreach (var member in members)
        {
            await notifier.NotifyAsync(new NotificationRequest(member, NotificationKind.SeriesDateCancelled, title, text, href), cancellationToken).ConfigureAwait(false);
        }
    }
}
