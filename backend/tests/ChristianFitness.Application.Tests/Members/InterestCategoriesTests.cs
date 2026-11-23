using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Application.Tests.Members;

/// <summary>L2-007 AC1 (ADR 0044): which kind of event each interest suggests, one case per row.</summary>
public sealed class InterestCategoriesTests
{
    [Theory]
    [InlineData("running", EventCategory.Run)]
    [InlineData("walking-groups", EventCategory.Run)]
    [InlineData("strength", EventCategory.Workout)]
    [InlineData("cycling", EventCategory.Workout)]
    [InlineData("basketball", EventCategory.Basketball)]
    [InlineData("mobility", EventCategory.Mobility)]
    [InlineData("nutrition", EventCategory.Workshop)]
    [InlineData("retreats", EventCategory.Retreat)]
    public void Given_an_interest_When_its_categories_are_asked_for_Then_it_names_one_category(string interest, EventCategory category)
    {
        Assert.Equal([category], InterestCategories.For([interest]));
    }

    [Fact]
    public void Given_every_known_interest_When_categories_are_asked_for_Then_each_names_a_category()
    {
        Assert.All(Interests.All, interest => Assert.Single(InterestCategories.For([interest])));
    }

    [Fact]
    public void Given_two_interests_of_one_category_and_an_unknown_one_When_categories_are_asked_for_Then_the_category_comes_once()
    {
        Assert.Equal([EventCategory.Run], InterestCategories.For(["running", "walking-groups", "yoga"]));
    }
}
