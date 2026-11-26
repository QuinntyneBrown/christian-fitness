using ChristianFitness.Domain.Events;

namespace ChristianFitness.Domain.Newsletter;

/// <summary>
/// When The Abundant Weekly goes out: every Saturday at 7 AM in Toronto (L1-018; ADR 0110).
/// </summary>
public static class WeeklyIssue
{
    public static readonly TimeOnly SendTime = new(7, 0);

    /// <summary>The first send strictly after <paramref name="now"/>: when a subscriber confirmed now first hears from it (L2-058 AC2).</summary>
    public static DateTimeOffset NextAfter(DateTimeOffset now)
    {
        var (today, _) = EventSchedule.TorontoOf(now);
        var date = today.AddDays(((int)DayOfWeek.Saturday - (int)today.DayOfWeek + 7) % 7);
        var send = EventSchedule.StartOf(date, SendTime);
        return send > now ? send : EventSchedule.StartOf(date.AddDays(7), SendTime);
    }
}
