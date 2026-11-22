namespace ChristianFitness.Domain.Members;

/// <summary>
/// The rule "at most <see cref="Limit"/> attempts within <see cref="Period"/>" (ADR 0010). It holds
/// no state: a feature counts its own attempts since <see cref="Since"/> in its own store and asks
/// <see cref="IsFull"/>, so the count holds across instances and restarts. Reset requests use it
/// (3 an hour, L2-044 AC6); the failed sign-in window (5 in 15 minutes, L2-004 AC3) can too.
/// </summary>
public sealed record AttemptWindow
{
    public AttemptWindow(int limit, TimeSpan period)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(limit);
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(period, TimeSpan.Zero);
        Limit = limit;
        Period = period;
    }

    public int Limit { get; }

    public TimeSpan Period { get; }

    /// <summary>
    /// The window's start for <paramref name="now"/>: an attempt counts when it was made after this
    /// instant, so one made exactly <see cref="Period"/> ago no longer counts.
    /// </summary>
    public DateTimeOffset Since(DateTimeOffset now) => now - Period;

    /// <summary>Whether <paramref name="attemptsSince"/> attempts inside the window leave no room for another.</summary>
    public bool IsFull(int attemptsSince) => attemptsSince >= Limit;
}
