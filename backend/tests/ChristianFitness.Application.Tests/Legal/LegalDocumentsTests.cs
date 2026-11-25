using System.Globalization;
using ChristianFitness.Domain.Legal;

namespace ChristianFitness.Application.Tests.Legal;

public sealed class LegalDocumentsTests
{
    [Theory]
    [InlineData("2026-03-31", null, "2026-04-01")]
    [InlineData("2026-04-01", "2026-04-01", null)]
    [InlineData("2026-05-01", "2026-04-01", null)]
    [InlineData("2026-05-02", "2026-04-01", "2026-06-01")]
    [InlineData("2026-05-31", "2026-04-01", "2026-06-01")]
    [InlineData("2026-06-01", "2026-06-01", null)]
    public void Given_versions_When_the_day_changes_Then_current_and_upcoming_follow_the_UTC_calendar(string today, string? current, string? upcoming)
    {
        var schedule = new LegalDocuments([new(2026, 4, 1), new(2026, 6, 1)], [new(2026, 4, 1)]);
        var day = DateOnly.Parse(today, CultureInfo.InvariantCulture);
        Assert.Equal(current, schedule.InForce("privacy",day)?.ToString("yyyy-MM-dd",CultureInfo.InvariantCulture));
        Assert.Equal(upcoming, schedule.Upcoming("privacy",day)?.ToString("yyyy-MM-dd",CultureInfo.InvariantCulture));
    }
}
