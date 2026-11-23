namespace ChristianFitness.Domain.Events;

/// <summary>
/// Events happen in the Greater Toronto Area, so staff give a start as a Toronto date and time and
/// members read it back in Toronto, wherever either of them is (ADR 0020).
/// </summary>
public static class EventSchedule
{
    /// <summary>The community's time zone, by its IANA id (ICU on Windows, tzdata on Linux).</summary>
    public const string TimeZoneId = "America/Toronto";

    public static TimeZoneInfo Toronto { get; } = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);

    /// <summary>
    /// The instant, in UTC, of <paramref name="time"/> on <paramref name="date"/> in Toronto. A time
    /// inside the spring-forward gap, which no Toronto clock shows, takes the standard offset; a time
    /// in the fall-back hour, which Toronto clocks show twice, takes the standard offset too.
    /// </summary>
    public static DateTimeOffset StartOf(DateOnly date, TimeOnly time)
    {
        var local = date.ToDateTime(time, DateTimeKind.Unspecified);
        var offset = Toronto.IsInvalidTime(local) ? Toronto.BaseUtcOffset : Toronto.GetUtcOffset(local);
        return new DateTimeOffset(local, offset).ToUniversalTime();
    }
}
