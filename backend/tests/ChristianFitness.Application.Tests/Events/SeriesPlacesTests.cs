using System.Globalization;
using ChristianFitness.Domain.Events;

namespace ChristianFitness.Application.Tests.Events;

/// <summary>
/// ADR 0080, ADR 0096: a series' spots left are the smallest number of places left among its
/// sessions still to come (not cancelled, not started), never below 0, and none when no session is
/// to come; one case per row. Sessions start at 6:30 PM in Toronto; now is April 15, noon.
/// </summary>
public sealed class SeriesPlacesTests
{
    private static readonly DateTimeOffset Now = At("2026-04-15", "12:00");

    private static DateTimeOffset At(string date, string time = "18:30") =>
        EventSchedule.StartOf(DateOnly.Parse(date, CultureInfo.InvariantCulture), TimeOnly.Parse(time, CultureInfo.InvariantCulture));

    public static TheoryData<string, string[], int, int?> Rows() => new()
    {
        // why, sessions ("<date>:<going>", "x" before a cancelled one), capacity, spots left
        { "no sessions: none", [], 40, null },
        { "only past sessions: none", ["2026-04-07:40", "2026-04-14:2"], 40, null },
        { "only cancelled to come: none", ["x2026-04-21:0"], 40, null },
        { "one to come: its places left", ["2026-04-21:31"], 40, 9 },
        { "the fullest to come decides", ["2026-04-21:31", "2026-04-28:38", "2026-05-05:20"], 40, 2 },
        { "a full past session does not count", ["2026-04-14:40", "2026-04-21:10"], 40, 30 },
        { "a full cancelled session does not count", ["x2026-04-21:40", "2026-04-28:10"], 40, 30 },
        { "one to come is full: 0", ["2026-04-21:12", "2026-04-28:40"], 40, 0 },
        { "over capacity reads 0, never below", ["2026-04-21:45"], 40, 0 },
        { "a session that started today is not to come", ["2026-04-15@11:00:40", "2026-04-21:5"], 40, 35 },
    };

    [Theory]
    [MemberData(nameof(Rows))]
    public void Given_sessions_and_their_going_When_spots_left_are_computed_Then_they_follow_the_table(string why, string[] sessions, int capacity, int? left)
    {
        var rows = sessions.Select(s =>
        {
            var cancelled = s.StartsWith('x');
            var parts = s.TrimStart('x').Split(':');
            var going = int.Parse(parts[^1], CultureInfo.InvariantCulture);
            var when = string.Join(':', parts[..^1]);
            var start = when.Split('@') is [var d, var t] ? At(d, t) : At(when);
            return (new SessionTimes(start, null, cancelled), going);
        }).ToList();

        var spots = SeriesPlaces.SpotsLeft(capacity, rows, Now);

        Assert.True(spots == left, $"{why}: {spots}");
    }
}
