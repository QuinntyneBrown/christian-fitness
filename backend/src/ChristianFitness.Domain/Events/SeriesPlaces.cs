namespace ChristianFitness.Domain.Events;

/// <summary>
/// How many places a series has left (ADR 0080, ADR 0096): joining holds a place at every session
/// still to come, so the series has as many as its fullest such session.
/// </summary>
public static class SeriesPlaces
{
    /// <summary>
    /// The smallest <c>capacity − going</c> among the sessions neither cancelled nor started at
    /// <paramref name="now"/>, never below 0; none when no session is to come.
    /// </summary>
    public static int? SpotsLeft(int capacity, IEnumerable<(SessionTimes Times, int Going)> sessions, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(sessions);
        var going = sessions
            .Where(s => !s.Times.Cancelled && s.Times.StartsAt > now)
            .Select(s => s.Going)
            .ToList();
        return going.Count == 0 ? null : Math.Max(0, capacity - going.Max());
    }
}
