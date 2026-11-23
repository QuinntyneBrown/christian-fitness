using ChristianFitness.Application.Account;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Application.Tests.Account;

/// <summary>
/// L2-034 AC3: the sliding hour of 10 reset requests per client address, one case per row (ADR
/// 0014). The address key is <c>ClientAddressPartition</c>'s, tested with the account creations.
/// </summary>
public sealed class PasswordResetRequestLimiterTests
{
    private static readonly DateTimeOffset Start = new(2026, 11, 22, 9, 0, 0, TimeSpan.Zero);

    public static TheoryData<string, int[], int, bool> Windows() => new()
    {
        // why, minutes after the start of each earlier request, minutes after the start of the
        // attempt, allowed
        { "no request yet", [], 0, true },
        { "9 requests in the hour", [0, 1, 2, 3, 4, 5, 6, 7, 8], 9, true },
        { "10 requests in the hour", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 10, false },
        { "10 requests, the first 59 minutes ago", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 59, false },
        { "10 requests, the first exactly an hour ago", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 60, true },
        { "10 requests, all over an hour ago", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 200, true },
    };

    [Theory]
    [MemberData(nameof(Windows))]
    public void Given_earlier_requests_When_another_is_made_Then_the_sliding_hour_decides(string why, int[] earlier, int attemptAt, bool allowed)
    {
        var time = new FakeTimeProvider(Start);
        var limiter = new PasswordResetRequestLimiter(time);
        foreach (var minute in earlier)
        {
            time.SetUtcNow(Start.AddMinutes(minute));
            Assert.NotNull(limiter.TryAcquire("203.0.113.7"));
        }

        time.SetUtcNow(Start.AddMinutes(attemptAt));
        Assert.Equal(allowed, limiter.TryAcquire("203.0.113.7") is not null);
        Assert.NotNull(why);
    }

    [Fact]
    public void Given_an_address_at_its_limit_When_another_address_asks_Then_it_is_allowed()
    {
        var limiter = new PasswordResetRequestLimiter(new FakeTimeProvider(Start));
        for (var i = 0; i < PasswordResetRequestLimiter.Limit; i++)
        {
            Assert.NotNull(limiter.TryAcquire("203.0.113.7"));
        }

        Assert.Null(limiter.TryAcquire("203.0.113.7"));
        Assert.NotNull(limiter.TryAcquire("203.0.113.8"));
    }

    // The two limits count apart: a full reset window leaves account creations alone.
    [Fact]
    public void Given_an_address_at_its_reset_limit_When_it_creates_an_account_Then_the_creation_limit_allows_it()
    {
        var time = new FakeTimeProvider(Start);
        var resets = new PasswordResetRequestLimiter(time);
        var creations = new AccountCreationLimiter(time);
        for (var i = 0; i < PasswordResetRequestLimiter.Limit; i++)
        {
            Assert.NotNull(resets.TryAcquire("203.0.113.7"));
        }

        Assert.NotNull(creations.TryAcquire("203.0.113.7"));
    }
}
