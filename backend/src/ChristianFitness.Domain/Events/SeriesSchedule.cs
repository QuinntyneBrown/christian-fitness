namespace ChristianFitness.Domain.Events;

/// <summary>Where a session of a series stands, as the console shows it (L2-071 AC3; ADR 0091).</summary>
public enum SessionState
{
    /// <summary>Held, and its end (its start when it has none) has passed.</summary>
    Done,

    /// <summary>The first held session that is not done.</summary>
    Live,

    /// <summary>Held, after the live one.</summary>
    Upcoming,

    /// <summary>Cancelled; it still counts for the session numbers (ADR 0080).</summary>
    Cancelled,
}

/// <summary>
/// How often a series meets (ADR 0080, ADR 0091): the Toronto weekday when the held dates meet
/// weekly on it (<see cref="SeriesSchedule.CadenceOf"/>), else none, and how many held dates there are.
/// </summary>
public readonly record struct SeriesCadence(DayOfWeek? Weekday, int Dates);

/// <summary>One session as the schedule rules read it.</summary>
public readonly record struct SessionTimes(DateTimeOffset StartsAt, DateTimeOffset? EndsAt, bool Cancelled);

/// <summary>
/// The series rules computed from the dates, never stored (ADR 0080, ADR 0091): the cadence, each
/// session's state, and how many are held and left. Cancelled dates are left out of all but the
/// session numbers, which are positions in date order.
/// </summary>
public static class SeriesSchedule
{
    /// <summary>
    /// The cadence of a series' sessions (ADR 0091): weekly on a Toronto weekday when two or more
    /// held dates all fall on it and every week from the first held date to the last has a date,
    /// held or cancelled (a cancelled date keeps its week); the count is of held dates only.
    /// </summary>
    public static SeriesCadence CadenceOf(IEnumerable<SessionTimes> sessions)
    {
        ArgumentNullException.ThrowIfNull(sessions);
        var all = sessions.Select(s => (Date: EventSchedule.TorontoOf(s.StartsAt).Date, s.Cancelled)).ToList();
        var held = all.Where(s => !s.Cancelled).Select(s => s.Date).Order().ToList();
        if (held.Count < 2 || held.Any(date => date.DayOfWeek != held[0].DayOfWeek))
        {
            return new SeriesCadence(null, held.Count);
        }

        var dated = all.Select(s => s.Date.DayNumber).ToHashSet();
        var weeks = (held[^1].DayNumber - held[0].DayNumber) / 7;
        var everyWeek = Enumerable.Range(0, weeks + 1).All(week => dated.Contains(held[0].DayNumber + (7 * week)));
        return new SeriesCadence(everyWeek ? held[0].DayOfWeek : null, held.Count);
    }

    /// <summary>The state of each session, in the order given (date order), at <paramref name="now"/>.</summary>
    public static IReadOnlyList<SessionState> StatesOf(IReadOnlyList<SessionTimes> sessions, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(sessions);
        var states = new List<SessionState>(sessions.Count);
        var liveGiven = false;
        foreach (var session in sessions)
        {
            if (session.Cancelled)
            {
                states.Add(SessionState.Cancelled);
            }
            else if ((session.EndsAt ?? session.StartsAt) <= now)
            {
                states.Add(SessionState.Done);
            }
            else if (!liveGiven)
            {
                liveGiven = true;
                states.Add(SessionState.Live);
            }
            else
            {
                states.Add(SessionState.Upcoming);
            }
        }

        return states;
    }

    /// <summary>How many sessions are left: held and not started (ADR 0080).</summary>
    public static int LeftOf(IEnumerable<SessionTimes> sessions, DateTimeOffset now) =>
        sessions.Count(session => !session.Cancelled && session.StartsAt > now);
}
