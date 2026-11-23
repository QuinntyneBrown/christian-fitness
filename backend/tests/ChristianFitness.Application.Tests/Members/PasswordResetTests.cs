using System.Security.Cryptography;
using System.Text;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Application.Tests.Members;

/// <summary>
/// L2-044 AC2 and AC6: a reset keeps only its token's hash and expires 30 minutes after the request;
/// the window rule "at most N within a period", one case per row.
/// </summary>
public sealed class PasswordResetTests
{
    private static readonly DateTimeOffset Now = new(2026, 4, 15, 12, 45, 0, TimeSpan.Zero);

    [Fact]
    public void Given_a_member_When_a_reset_is_issued_Then_it_keeps_the_hash_of_a_43_character_base64url_token_and_expires_in_30_minutes()
    {
        var memberId = Guid.CreateVersion7();

        var (reset, token) = PasswordReset.Issue(memberId, Now);

        Assert.Matches("^[A-Za-z0-9_-]{43}$", token);
        Assert.Equal(memberId, reset.MemberId);
        Assert.Equal(Convert.ToHexStringLower(SHA256.HashData(Encoding.ASCII.GetBytes(token))), reset.TokenHash);
        Assert.Equal(PasswordReset.HashOf(token), reset.TokenHash);
        Assert.Equal(Now, reset.RequestedAt);
        Assert.Equal(Now.AddMinutes(30), reset.ExpiresAt);
        Assert.NotEqual(Guid.Empty, reset.Id);
    }

    [Fact]
    public void Given_many_resets_When_they_are_issued_Then_no_two_tokens_are_alike()
    {
        var tokens = Enumerable.Range(0, 100).Select(_ => PasswordReset.Issue(Guid.CreateVersion7(), Now).Token).ToHashSet(StringComparer.Ordinal);

        Assert.Equal(100, tokens.Count);
    }

    public static TheoryData<string, int, int, int, bool> WindowCases() => new()
    {
        // why, limit, minutes in the period, attempts inside the window, expected full
        { "none yet", 3, 60, 0, false },
        { "one short of the limit", 3, 60, 2, false },
        { "at the limit", 3, 60, 3, true },
        { "past the limit", 3, 60, 4, true },
        { "sign-in failures, at four of five", 5, 15, 4, false },
        { "sign-in failures, at five of five", 5, 15, 5, true },
    };

    [Theory]
    [MemberData(nameof(WindowCases))]
    public void Given_attempts_inside_a_window_When_it_is_asked_whether_it_is_full_Then_it_is_full_at_its_limit(string why, int limit, int minutes, int attempts, bool expected)
    {
        var window = new AttemptWindow(limit, TimeSpan.FromMinutes(minutes));

        Assert.True(expected == window.IsFull(attempts), why);
    }

    [Fact]
    public void Given_a_window_When_its_start_is_asked_Then_it_is_one_period_before_now()
    {
        Assert.Equal(Now.AddHours(-1), PasswordReset.RequestWindow.Since(Now));
        Assert.Equal(3, PasswordReset.RequestWindow.Limit);
        Assert.Equal(TimeSpan.FromHours(1), PasswordReset.RequestWindow.Period);
    }

    [Theory]
    [InlineData(0, 60)]
    [InlineData(-1, 60)]
    [InlineData(3, 0)]
    public void Given_a_limit_or_period_that_is_not_positive_When_a_window_is_made_Then_it_is_refused(int limit, int minutes)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new AttemptWindow(limit, TimeSpan.FromMinutes(minutes)));
    }

    public static TheoryData<string, int, bool, bool> UsableCases() => new()
    {
        // why, seconds after the request, used before, expected usable (L2-045 AC2, AC4)
        { "just requested", 0, false, true },
        { "one second short of 30 minutes", (30 * 60) - 1, false, true },
        { "at 30 minutes", 30 * 60, false, false },
        { "an hour later", 60 * 60, false, false },
        { "just requested but used", 0, true, false },
    };

    [Theory]
    [MemberData(nameof(UsableCases))]
    public void Given_a_reset_When_it_is_asked_whether_it_is_usable_Then_only_an_unused_one_younger_than_30_minutes_is(string why, int seconds, bool used, bool expected)
    {
        var (reset, _) = PasswordReset.Issue(Guid.CreateVersion7(), Now);
        if (used)
        {
            reset.Use(Now);
        }

        Assert.True(expected == reset.IsUsableAt(Now.AddSeconds(seconds)), why);
    }

    [Fact]
    public void Given_a_reset_When_it_is_used_Then_it_records_when()
    {
        var (reset, _) = PasswordReset.Issue(Guid.CreateVersion7(), Now);

        reset.Use(Now.AddMinutes(5));

        Assert.Equal(Now.AddMinutes(5), reset.UsedAt);
    }
}
