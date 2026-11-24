using ChristianFitness.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Dashboard;

/// <summary>
/// One week of community activity (L2-020 AC4; ADR 0000): a Monday 00:00 UTC start and three
/// counts. Counts only: no message text, no names, no member ids.
/// </summary>
public sealed record CommunityActivityWeekDto(DateTimeOffset Start, int NewMembers, int Registrations, int Messages);

/// <summary>The last weeks of activity, oldest first, the current week last.</summary>
public sealed record CommunityActivityDto(IReadOnlyList<CommunityActivityWeekDto> Weeks);

/// <summary>Staff ask for the weekly activity of the community (L2-020 AC4; ADR 0059).</summary>
public sealed record GetCommunityActivityQuery : IRequest<CommunityActivityDto>;

/// <summary>
/// The weeks of the rule (ADR 0059): a week starts on Monday at 00:00 UTC; the last
/// <see cref="Count"/> weeks end with the one that holds now, which runs to now.
/// </summary>
internal static class ActivityWeeks
{
    public const int Count = 8;

    /// <summary>The start of each week, oldest first.</summary>
    public static IReadOnlyList<DateTimeOffset> StartsAt(DateTimeOffset now)
    {
        var today = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        var current = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
        return [.. Enumerable.Range(0, Count).Select(i => current.AddDays(7 * (i - (Count - 1))))];
    }
}

/// <summary>
/// Counts each week's new members (by join time), registrations (by creation time) and messages,
/// event chat and direct together (by sent time). Rows from the future, or before the first week,
/// are in no week. It reads counts only, so no name, address or message text is ever loaded, and it
/// logs nothing.
/// </summary>
internal sealed class GetCommunityActivityHandler(IAppDbContext db, TimeProvider time)
    : IRequestHandler<GetCommunityActivityQuery, CommunityActivityDto>
{
    public async Task<CommunityActivityDto> Handle(GetCommunityActivityQuery request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var starts = ActivityWeeks.StartsAt(now);
        var weeks = new List<CommunityActivityWeekDto>(starts.Count);
        for (var i = 0; i < starts.Count; i++)
        {
            var from = starts[i];
            var last = i == starts.Count - 1;
            var to = last ? now : starts[i + 1].AddTicks(-1);
            var members = await db.Members.CountAsync(m => m.JoinedAt >= from && m.JoinedAt <= to, cancellationToken).ConfigureAwait(false);
            var registrations = await db.Registrations.CountAsync(r => r.CreatedAt >= from && r.CreatedAt <= to, cancellationToken).ConfigureAwait(false);
            var chat = await db.ChatMessages.CountAsync(m => m.SentAt >= from && m.SentAt <= to, cancellationToken).ConfigureAwait(false);
            var direct = await db.DirectMessages.CountAsync(m => m.SentAt >= from && m.SentAt <= to, cancellationToken).ConfigureAwait(false);
            weeks.Add(new CommunityActivityWeekDto(from, members, registrations, chat + direct));
        }

        return new CommunityActivityDto(weeks);
    }
}
