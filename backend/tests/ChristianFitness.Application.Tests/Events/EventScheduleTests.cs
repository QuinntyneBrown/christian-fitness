using ChristianFitness.Domain.Events;

namespace ChristianFitness.Application.Tests.Events;

/// <summary>
/// ADR 0015: a Toronto date and time to the UTC instant, one case per row, across both changes of
/// the clock in 2026 (March 8 and November 1). The admin app's <c>eventWhen</c>
/// (frontend/projects/domain/src/events/event-when.spec.ts) reads the same instants back.
/// </summary>
public sealed class EventScheduleTests
{
    public static TheoryData<string, string, string, string> Cases() => new()
    {
        // why, Toronto date, Toronto time, the instant in UTC
        { "standard time, UTC-5", "2026-01-09", "07:30", "2026-01-09T12:30:00Z" },
        { "daylight time, UTC-4", "2026-05-22", "16:00", "2026-05-22T20:00:00Z" },
        { "the last minute before spring forward", "2026-03-08", "01:59", "2026-03-08T06:59:00Z" },
        { "inside the spring-forward gap, standard offset", "2026-03-08", "02:30", "2026-03-08T07:30:00Z" },
        { "after spring forward", "2026-03-08", "03:00", "2026-03-08T07:00:00Z" },
        { "the fall-back hour, standard offset", "2026-11-01", "01:30", "2026-11-01T06:30:00Z" },
        { "after fall back", "2026-11-01", "02:00", "2026-11-01T07:00:00Z" },
        { "midnight on New Year's Day", "2027-01-01", "00:00", "2027-01-01T05:00:00Z" },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public void Given_a_Toronto_date_and_time_When_the_start_is_computed_Then_it_is_the_instant_in_UTC(string why, string date, string time, string expected)
    {
        var start = EventSchedule.StartOf(DateOnly.Parse(date, System.Globalization.CultureInfo.InvariantCulture), TimeOnly.Parse(time, System.Globalization.CultureInfo.InvariantCulture));

        Assert.True(DateTimeOffset.Parse(expected, System.Globalization.CultureInfo.InvariantCulture) == start && start.Offset == TimeSpan.Zero, $"{why}: {start:O}");
    }
}
