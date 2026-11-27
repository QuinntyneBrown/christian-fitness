using ChristianFitness.Domain.Members;

namespace ChristianFitness.Application.Tests.Members;

/// <summary>
/// L2-006 AC2 and AC4 (ADR 0024): what <see cref="Member.EditProfile"/> stores, one case per row:
/// trimmed text, none for a blank optional field, no blank goals, each interest once, and the home
/// church hidden until shown.
/// </summary>
public sealed class MemberEditProfileTests
{
    private static readonly DateTimeOffset JoinedAt = new(2026, 1, 14, 15, 30, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("   ", null)]
    [InlineData("Toronto, ON", "Toronto, ON")]
    [InlineData("  Toronto, ON ", "Toronto, ON")]
    public void Given_an_optional_text_When_the_profile_is_edited_Then_it_is_kept_trimmed_or_none_when_blank(string? given, string? stored)
    {
        var member = Joined();

        member.EditProfile("Grace Thompson", given, given, given, [], []);

        Assert.Equal(stored, member.City);
        Assert.Equal(stored, member.HomeChurch);
        Assert.Equal(stored, member.Bio);
    }

    [Fact]
    public void Given_a_name_with_spaces_around_it_When_the_profile_is_edited_Then_it_is_kept_trimmed()
    {
        var member = Joined();

        member.EditProfile("  Grace T. Thompson ", null, null, null, [], []);

        Assert.Equal("Grace T. Thompson", member.Name);
    }

    [Theory]
    [InlineData(new string[0], new string[0])]
    [InlineData(new[] { "Half marathon in the fall" }, new[] { "Half marathon in the fall" })]
    [InlineData(new[] { " Half marathon in the fall ", "Sleep before 11" }, new[] { "Half marathon in the fall", "Sleep before 11" })]
    [InlineData(new[] { "Half marathon in the fall", "", "   ", "Sleep before 11" }, new[] { "Half marathon in the fall", "Sleep before 11" })]
    public void Given_goals_When_the_profile_is_edited_Then_blank_ones_are_dropped_and_each_is_trimmed(string[] given, string[] stored)
    {
        var member = Joined();

        member.EditProfile("Grace Thompson", null, null, null, given, []);

        Assert.Equal(stored, member.Goals);
    }

    [Theory]
    [InlineData(new[] { "running", "cycling" }, new[] { "running", "cycling" })]
    [InlineData(new[] { "running", "cycling", "running" }, new[] { "running", "cycling" })]
    public void Given_interests_When_the_profile_is_edited_Then_each_is_kept_once_in_order(string[] given, string[] stored)
    {
        var member = Joined();

        member.EditProfile("Grace Thompson", null, null, null, [], given);

        Assert.Equal(stored, member.Interests);
    }

    [Fact]
    public void Given_a_new_member_When_they_have_not_chosen_Then_their_home_church_is_hidden()
    {
        Assert.False(Joined().ShowHomeChurch);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Given_a_visibility_choice_made_in_preferences_When_the_profile_is_edited_Then_it_is_kept(bool show)
    {
        var member = Joined();
        member.ChangeFromPreferences(null, show);

        member.EditProfile("Grace Thompson", null, "Grace Fellowship, Scarborough", null, [], []);

        Assert.Equal(show, member.ShowHomeChurch);
    }

    private static Member Joined() =>
        Member.Join("Grace Thompson", "grace.thompson@gmail.com", "hash", JoinedAt, "Grace Fellowship, Scarborough", ["running"]);
}
