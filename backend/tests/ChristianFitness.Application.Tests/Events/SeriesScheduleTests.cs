using System.Globalization;
using ChristianFitness.Domain.Events;

namespace ChristianFitness.Application.Tests.Events;

/// <summary>
/// ADR 0080, ADR 0091: a series' cadence and its sessions' states, computed from the dates and the
/// clock, one case per row. Times are Toronto 6:30 PM starts unless a row says otherwise.
/// </summary>
public sealed class SeriesScheduleTests
{
    private static DateTimeOffset At(string date, string time = "18:30") =>
        EventSchedule.StartOf(DateOnly.Parse(date, CultureInfo.InvariantCulture), TimeOnly.Parse(time, CultureInfo.InvariantCulture));

    public static TheoryData<string, string[], int?, int> Cadences() => new()
    {
        // why, sessions (Toronto date[@time], "x" before a cancelled one), weekday (0 Sunday), held dates
        { "no dates", [], null, 0 },
        { "one date: no cadence yet", ["2026-04-21"], null, 1 },
        { "every Tuesday", ["2026-04-07", "2026-04-14", "2026-04-21"], 2, 3 },
        { "a week with no date is not weekly", ["2026-04-07", "2026-04-21"], null, 2 },
        { "a cancelled date keeps its week", ["2026-04-07", "x2026-04-14", "2026-04-21"], 2, 2 },
        { "a cancelled date off the weekday breaks nothing", ["2026-04-07", "x2026-04-09", "2026-04-14"], 2, 2 },
        { "only one held date beside cancelled ones", ["2026-04-07", "x2026-04-14"], null, 1 },
        { "two dates in one week", ["2026-04-07", "2026-04-09"], null, 2 },
        { "two weekdays a week apart each", ["2026-04-07", "2026-04-15"], null, 2 },
        { "weekly across spring forward, by the Toronto date", ["2026-03-03", "2026-03-10"], 2, 2 },
        { "a late start still falls on its Toronto day", ["2026-04-04@23:30", "2026-04-11@23:30"], 6, 2 },
        { "a different time on the same weekday is still weekly", ["2026-04-04@08:00", "2026-04-11@09:30"], 6, 2 },
    };

    [Theory]
    [MemberData(nameof(Cadences))]
    public void Given_dates_When_the_cadence_is_computed_Then_it_follows_the_table(string why, string[] sessions, int? weekday, int dates)
    {
        var times = sessions.Select(s =>
        {
            var cancelled = s.StartsWith('x');
            var start = s.TrimStart('x').Split('@') is [var d, var t] ? At(d, t) : At(s.TrimStart('x'));
            return new SessionTimes(start, null, cancelled);
        }).ToList();

        var cadence = SeriesSchedule.CadenceOf(times);

        Assert.True(cadence == new SeriesCadence((DayOfWeek?)weekday, dates), $"{why}: {cadence}");
    }

    public static TheoryData<string, (string Date, bool Cancelled, bool HasEnd)[], string, string> States() => new()
    {
        // why, sessions in date order (6:30 to 7:30 PM, or no end), now (Toronto), states
        { "before any: the first is live", [("2026-04-21", false, true), ("2026-04-28", false, true)], "2026-04-15T12:00", "live,upcoming" },
        { "while one runs it stays live", [("2026-04-21", false, true), ("2026-04-28", false, true)], "2026-04-21T19:00", "live,upcoming" },
        { "at its end it is done", [("2026-04-21", false, true), ("2026-04-28", false, true)], "2026-04-21T19:30", "done,live" },
        { "with no end, done at its start", [("2026-04-21", false, false), ("2026-04-28", false, false)], "2026-04-21T18:30", "done,live" },
        { "a cancelled date is never live", [("2026-04-21", true, true), ("2026-04-28", false, true)], "2026-04-15T12:00", "cancelled,live" },
        { "a past cancelled date stays cancelled", [("2026-04-07", true, true), ("2026-04-28", false, true)], "2026-04-15T12:00", "cancelled,live" },
        { "all over: none live", [("2026-04-07", false, true), ("2026-04-14", false, true)], "2026-04-15T12:00", "done,done" },
    };

    [Theory]
    [MemberData(nameof(States))]
    public void Given_sessions_and_a_time_When_their_states_are_computed_Then_they_follow_the_table(
        string why, (string Date, bool Cancelled, bool HasEnd)[] sessions, string now, string states)
    {
        var times = sessions.Select(s => new SessionTimes(At(s.Date), s.HasEnd ? At(s.Date, "19:30") : null, s.Cancelled)).ToList();
        var parts = now.Split('T');

        var actual = SeriesSchedule.StatesOf(times, At(parts[0], parts[1]));

        Assert.True(string.Join(',', actual.Select(s => s.ToString().ToLowerInvariant())) == states, $"{why}: {string.Join(',', actual)}");
    }

    public static TheoryData<string, (string Date, bool Cancelled)[], int> Lefts() => new()
    {
        // why, sessions, left at April 15 2026 noon Toronto
        { "none", [], 0 },
        { "past dates are not left", [("2026-04-07", false), ("2026-04-21", false)], 1 },
        { "a cancelled date is not left", [("2026-04-21", true), ("2026-04-28", false)], 1 },
        { "every future held date", [("2026-04-21", false), ("2026-04-28", false), ("2026-05-05", false)], 3 },
    };

    [Theory]
    [MemberData(nameof(Lefts))]
    public void Given_sessions_When_those_left_are_counted_Then_only_held_ones_not_started_count(string why, (string Date, bool Cancelled)[] sessions, int left)
    {
        var times = sessions.Select(s => new SessionTimes(At(s.Date), null, s.Cancelled));

        Assert.True(SeriesSchedule.LeftOf(times, At("2026-04-15", "12:00")) == left, why);
    }
}
