using ChristianFitness.Domain.Newsletter;

namespace ChristianFitness.Application.Tests.Newsletter;

/// <summary>
/// L2-058 AC2, ADR 0110: a confirmed subscriber's first issue is the next Saturday at 7 AM in Toronto
/// after the confirmation, one row per case, across both clock changes.
/// </summary>
public sealed class WeeklyIssueTests
{
    [Theory]
    // Thursday 26 November 2026, 9 AM in Toronto (EST, UTC-5): this Saturday.
    [InlineData("2026-11-26T14:00:00Z", "2026-11-28T12:00:00Z")]
    // Saturday 28 November, 6:59 AM in Toronto: a minute before the send, so today.
    [InlineData("2026-11-28T11:59:00Z", "2026-11-28T12:00:00Z")]
    // Saturday 28 November, 7:00 AM in Toronto exactly: that send has gone, so next Saturday.
    [InlineData("2026-11-28T12:00:00Z", "2026-12-05T12:00:00Z")]
    // Saturday 28 November, 8 PM in Toronto (Sunday 01:00 UTC): next Saturday.
    [InlineData("2026-11-29T01:00:00Z", "2026-12-05T12:00:00Z")]
    // Friday 6 March 2026 (EST): Saturday 7 March, still EST, 12:00 UTC.
    [InlineData("2026-03-06T15:00:00Z", "2026-03-07T12:00:00Z")]
    // Sunday 8 March 2026, the day clocks spring forward: Saturday 14 March in EDT, 11:00 UTC.
    [InlineData("2026-03-08T15:00:00Z", "2026-03-14T11:00:00Z")]
    // Sunday 1 November 2026, the day clocks fall back: Saturday 7 November in EST, 12:00 UTC.
    [InlineData("2026-11-01T15:00:00Z", "2026-11-07T12:00:00Z")]
    // Saturday 31 October 2026 at 7 AM EDT exactly: next Saturday, after the change, at 12:00 UTC.
    [InlineData("2026-10-31T11:00:00Z", "2026-11-07T12:00:00Z")]
    public void Given_a_confirmation_time_When_the_first_issue_is_worked_out_Then_it_is_the_next_Saturday_7_AM_in_Toronto(string now, string expected)
    {
        var first = WeeklyIssue.NextAfter(DateTimeOffset.Parse(now, System.Globalization.CultureInfo.InvariantCulture));

        Assert.Equal(DateTimeOffset.Parse(expected, System.Globalization.CultureInfo.InvariantCulture), first);
    }
}
