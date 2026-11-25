using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Application.Tests.Directory;

/// <summary>
/// L2-056 AC9 (ADR 0088): a member's follows and unfollows in a rolling hour are full at 60; a change
/// made exactly an hour ago no longer counts. One row per case.
/// </summary>
public sealed class FollowHourlyWindowTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 25, 15, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(0, false)]
    [InlineData(59, false)]
    [InlineData(60, true)]
    [InlineData(61, true)]
    public void Given_changes_in_the_last_hour_When_another_is_asked_Then_it_is_full_at_60(int changes, bool full)
    {
        Assert.Equal(full, ListingFollowChange.HourlyWindow.IsFull(changes));
    }

    [Fact]
    public void Given_now_When_the_window_starts_Then_it_is_one_hour_before()
    {
        Assert.Equal(Now.AddHours(-1), ListingFollowChange.HourlyWindow.Since(Now));
    }
}
