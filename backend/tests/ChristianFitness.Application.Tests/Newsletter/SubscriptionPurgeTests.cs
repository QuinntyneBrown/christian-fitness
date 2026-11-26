using ChristianFitness.Domain.Newsletter;

namespace ChristianFitness.Application.Tests.Newsletter;

/// <summary>
/// L2-058 AC6, AC9 (ADR 0078, ADR 0110): which subscriptions scheduled work deletes, one row per
/// case: Pending 30 days after its most recent request, Unsubscribed 29 days after it left (inside
/// the 30 days), Subscribed never.
/// </summary>
public sealed class SubscriptionPurgeTests
{
    private static readonly DateTimeOffset Start = new(2026, 11, 26, 14, 0, 0, TimeSpan.Zero);

    public enum Standing
    {
        Pending,
        PendingAskedAgainAfter10Days,
        Subscribed,
        Unsubscribed,
        UnsubscribedTwiceAfter5Days,
    }

    [Theory]
    [InlineData(Standing.Pending, "29.23:59:59", false)]
    [InlineData(Standing.Pending, "30.00:00:00", true)]
    [InlineData(Standing.PendingAskedAgainAfter10Days, "39.23:59:59", false)]
    [InlineData(Standing.PendingAskedAgainAfter10Days, "40.00:00:00", true)]
    [InlineData(Standing.Subscribed, "3650.00:00:00", false)]
    [InlineData(Standing.Unsubscribed, "28.23:59:59", false)]
    [InlineData(Standing.Unsubscribed, "29.00:00:00", true)]
    // A second visit to the link does not move the time it left.
    [InlineData(Standing.UnsubscribedTwiceAfter5Days, "29.00:00:00", true)]
    public void Given_a_subscription_When_time_passes_Then_it_is_purgeable_only_past_its_rule(Standing standing, string after, bool purgeable)
    {
        var subscription = NewsletterSubscription.Request("purge@example.org", Start);
        switch (standing)
        {
            case Standing.PendingAskedAgainAfter10Days:
                subscription.RequestAgain(Start.AddDays(10));
                break;
            case Standing.Subscribed:
                subscription.Confirm(Start);
                break;
            case Standing.Unsubscribed:
                subscription.Confirm(Start);
                subscription.Unsubscribe(Start);
                break;
            case Standing.UnsubscribedTwiceAfter5Days:
                subscription.Confirm(Start);
                subscription.Unsubscribe(Start);
                subscription.Unsubscribe(Start.AddDays(5));
                break;
        }

        Assert.Equal(purgeable, subscription.IsPurgeableAt(Start + TimeSpan.Parse(after, System.Globalization.CultureInfo.InvariantCulture)));
    }
}
