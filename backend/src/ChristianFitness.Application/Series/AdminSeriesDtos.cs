using ChristianFitness.Application.Events;
using ChristianFitness.Domain.Events;

namespace ChristianFitness.Application.Series;

/// <summary>
/// How often a series meets (ADR 0091): the Toronto weekday (0 Sunday to 6 Saturday) when every
/// held date is a week after the one before, else none, and how many dates are held. The admin app
/// words it ("Every Tuesday", "3 dates", "No dates yet"); numbers are fields, never words.
/// </summary>
public sealed record SeriesCadenceDto(int? Weekday, int Dates)
{
    public static SeriesCadenceDto Of(SeriesCadence cadence) => new(cadence.Weekday is { } day ? (int)day : null, cadence.Dates);
}

/// <summary>
/// One row of Event series (L2-071 AC1): the time is the next held session's start, else the last
/// held one's, else none; joined counts the series' members against its capacity.
/// </summary>
public sealed record AdminSeriesRowDto(Guid Id, string Title, SeriesCadenceDto Cadence, DateTimeOffset? StartsAt, int Joined, int Capacity);

/// <summary>The list: at most <see cref="ListAdminSeriesQuery.Limit"/> rows, soonest first.</summary>
public sealed record AdminSeriesListDto(IReadOnlyList<AdminSeriesRowDto> Series);

/// <summary>
/// One session as the console lists it (L2-071 AC3): its number among all the series' dates in date
/// order (cancelled ones included; ADR 0080), its times, topic and the state the API's clock gives.
/// </summary>
public sealed record AdminSessionDto(Guid Id, int Number, DateTimeOffset StartsAt, DateTimeOffset? EndsAt, string? Topic, string State);

/// <summary>
/// A series as its page shows it (L2-071 AC2, AC3): its details as the editor edits them, its
/// cadence and time as the list has them, the first and last held dates, joined of capacity,
/// sessions left of held, and every session in date order.
/// </summary>
public sealed record AdminSeriesDto(
    Guid Id,
    string Title,
    string Category,
    string Summary,
    string? ImageKey,
    EventHostDto Host,
    SeriesCadenceDto Cadence,
    DateTimeOffset? StartsAt,
    DateTimeOffset? FirstStartsAt,
    DateTimeOffset? LastStartsAt,
    string Place,
    string Area,
    int PriceCents,
    int? DropInPriceCents,
    int Capacity,
    int Joined,
    int SessionsLeft,
    int SessionsHeld,
    IReadOnlyList<AdminSessionDto> Sessions);

/// <summary>
/// What the console reads of a series' sessions, and the facts it derives from them (ADR 0080,
/// ADR 0091), shared by the list and the page so both answer the same.
/// </summary>
internal sealed record SeriesFacts(SeriesCadence Cadence, DateTimeOffset? Next, DateTimeOffset? First, DateTimeOffset? Last, int Left, int Held)
{
    /// <summary>The time the console shows: the next held session's start, else the last held one's.</summary>
    public DateTimeOffset? StartsAt => Next ?? Last;

    /// <summary>The facts of <paramref name="sessions"/>, in date order, at <paramref name="now"/>.</summary>
    public static SeriesFacts Of(IReadOnlyList<SessionTimes> sessions, DateTimeOffset now)
    {
        var held = sessions.Where(s => !s.Cancelled).Select(s => s.StartsAt).ToList();
        return new SeriesFacts(
            SeriesSchedule.CadenceOf(sessions),
            held.Where(start => start > now).Cast<DateTimeOffset?>().FirstOrDefault(),
            held.Count > 0 ? held[0] : null,
            held.Count > 0 ? held[^1] : null,
            SeriesSchedule.LeftOf(sessions, now),
            held.Count);
    }
}

/// <summary>The names the API gives a session's state: lower case, as the admin app reads them.</summary>
internal static class SessionStateNames
{
    public static string Of(SessionState state) => state switch
    {
        SessionState.Done => "done",
        SessionState.Live => "live",
        SessionState.Upcoming => "upcoming",
        SessionState.Cancelled => "cancelled",
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, "A session state with no name."),
    };
}
