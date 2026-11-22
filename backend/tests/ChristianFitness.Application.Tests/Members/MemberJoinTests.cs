using ChristianFitness.Domain.Members;

namespace ChristianFitness.Application.Tests.Members;

/// <summary>L2-003 AC4 and L2-033 AC1: the home church is optional; a blank one is stored as none.</summary>
public sealed class MemberJoinTests
{
    private static readonly DateTimeOffset JoinedAt = new(2026, 4, 15, 12, 45, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("   ", null)]
    [InlineData("Grace Fellowship, Scarborough", "Grace Fellowship, Scarborough")]
    [InlineData("  Grace Fellowship, Scarborough ", "Grace Fellowship, Scarborough")]
    public void Given_a_home_church_When_a_member_joins_Then_it_is_kept_trimmed_or_none_when_blank(string? given, string? stored)
    {
        var member = Member.Join("Grace Thompson", "grace.thompson@gmail.com", "hash", JoinedAt, given);

        Assert.Equal(stored, member.HomeChurch);
    }

    [Theory]
    [InlineData(new string[0], new string[0])]
    [InlineData(new[] { "running", "strength" }, new[] { "running", "strength" })]
    [InlineData(new[] { "running", "strength", "running" }, new[] { "running", "strength" })]
    public void Given_interests_When_a_member_joins_Then_each_is_kept_once_in_order(string[] given, string[] stored)
    {
        var member = Member.Join("Grace Thompson", "grace.thompson@gmail.com", "hash", JoinedAt, interests: given);

        Assert.Equal(stored, member.Interests);
    }
}
