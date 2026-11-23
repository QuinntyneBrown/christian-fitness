using System.Net;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Account;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Application.Tests.Account;

/// <summary>
/// L2-034 AC2: the key an address is counted under, and the sliding hour of 5 creations per key,
/// one case per row (ADR 0012).
/// </summary>
public sealed class AccountCreationLimiterTests
{
    private static readonly DateTimeOffset Start = new(2026, 11, 22, 9, 0, 0, TimeSpan.Zero);

    public static TheoryData<string, string?, string> Addresses() => new()
    {
        // why, address, key
        { "an IPv4 address is itself", "203.0.113.7", "203.0.113.7" },
        { "an IPv4-mapped IPv6 address is its IPv4 address", "::ffff:203.0.113.7", "203.0.113.7" },
        { "an IPv6 address is its /64", "2001:db8:aa:bb:1:2:3:4", "2001:db8:aa:bb::/64" },
        { "another address in that /64 is the same key", "2001:db8:aa:bb:ffff:ffff:ffff:ffff", "2001:db8:aa:bb::/64" },
        { "the next /64 is another key", "2001:db8:aa:bc::1", "2001:db8:aa:bc::/64" },
        { "the IPv6 loopback is its /64", "::1", "::/64" },
        { "no address is unknown", null, "unknown" },
    };

    [Theory]
    [MemberData(nameof(Addresses))]
    public void Given_a_client_address_When_it_is_keyed_Then_it_is_counted_under_its_key(string why, string? address, string key)
    {
        Assert.Equal(key, ClientAddressPartition.Of(address is null ? null : IPAddress.Parse(address)));
        Assert.NotNull(why);
    }

    public static TheoryData<string, int[], int, bool> Windows() => new()
    {
        // why, minutes after the start of each earlier creation, minutes after the start of the
        // attempt, allowed
        { "no creation yet", [], 0, true },
        { "4 creations in the hour", [0, 10, 20, 30], 40, true },
        { "5 creations in the hour", [0, 10, 20, 30, 40], 50, false },
        { "5 creations, the first 59 minutes ago", [0, 1, 2, 3, 4], 59, false },
        { "5 creations, the first exactly an hour ago", [0, 1, 2, 3, 4], 60, true },
        { "5 creations, all over an hour ago", [0, 1, 2, 3, 4], 200, true },
    };

    [Theory]
    [MemberData(nameof(Windows))]
    public void Given_earlier_creations_When_another_is_asked_for_Then_the_sliding_hour_decides(string why, int[] earlier, int attemptAt, bool allowed)
    {
        var time = new FakeTimeProvider(Start);
        var limiter = new AccountCreationLimiter(time);
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
    public void Given_5_creations_for_one_key_When_another_key_asks_Then_it_is_allowed()
    {
        var limiter = new AccountCreationLimiter(new FakeTimeProvider(Start));
        for (var i = 0; i < AccountCreationLimiter.Limit; i++)
        {
            Assert.NotNull(limiter.TryAcquire("203.0.113.7"));
        }

        Assert.Null(limiter.TryAcquire("203.0.113.7"));
        Assert.NotNull(limiter.TryAcquire("203.0.113.8"));
    }

    [Fact]
    public void Given_5_leases_When_one_is_released_Then_one_more_is_allowed_and_no_more()
    {
        var limiter = new AccountCreationLimiter(new FakeTimeProvider(Start));
        var leases = Enumerable.Range(0, AccountCreationLimiter.Limit).Select(_ => limiter.TryAcquire("203.0.113.7")!).ToList();

        limiter.Release(leases[2]);

        Assert.NotNull(limiter.TryAcquire("203.0.113.7"));
        Assert.Null(limiter.TryAcquire("203.0.113.7"));
    }
}
