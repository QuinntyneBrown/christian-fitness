using ChristianFitness.Domain.Events;

namespace ChristianFitness.Application.Tests.Events;

/// <summary>
/// L2-065 AC7 (ADR 0076): Home's suggestions rank, one case per row. An event in the member's area
/// or GTA-wide comes before one in another area; within each, an event of a followed listing, then
/// one matching an interest, then the rest; ties by date. A member with no area skips the first.
/// </summary>
public sealed class HomeSuggestionsTests
{
    private static readonly DateTimeOffset Now = new(2026, 4, 15, 12, 45, 0, TimeSpan.Zero);
    private static readonly Guid Followed = Guid.NewGuid();
    private static readonly Guid Other = Guid.NewGuid();

    private static HomeSuggestions.Candidate Event(string name, int day, string? area, bool followed, EventCategory category) =>
        new(Guid.NewGuid(), name, Now.AddDays(day), area, followed ? Followed : Other, category);

    public static TheoryData<string, string?, string[]> Rows => new()
    {
        // why, the member's area, the order expected
        { "the member's area and GTA-wide come before another area", "scarborough", ["in-area", "gta-wide", "elsewhere"] },
        { "no area chosen: by date alone among equals", null, ["elsewhere", "in-area", "gta-wide"] },
    };

    [Theory]
    [MemberData(nameof(Rows))]
    public void Given_events_in_and_out_of_the_area_When_ranked_Then_the_area_comes_first_unless_none_is_chosen(string why, string? area, string[] expected)
    {
        // All three match no follow and no interest; "elsewhere" is the soonest.
        HomeSuggestions.Candidate[] events =
        [
            Event("elsewhere", 1, "brampton", false, EventCategory.Retreat),
            Event("in-area", 2, "scarborough", false, EventCategory.Retreat),
            Event("gta-wide", 3, null, false, EventCategory.Retreat),
        ];

        var ranked = HomeSuggestions.Rank(events, area, [Followed], [EventCategory.Run]);

        Assert.True(expected.SequenceEqual(ranked.Select(e => e.Title)), why);
    }

    [Fact]
    public void Given_events_in_the_area_When_ranked_Then_a_followed_listing_comes_before_an_interest_and_that_before_the_rest_with_ties_by_date()
    {
        HomeSuggestions.Candidate[] events =
        [
            Event("rest, soonest", 1, null, false, EventCategory.Retreat),
            Event("interest, later", 5, null, false, EventCategory.Run),
            Event("interest, sooner", 2, null, false, EventCategory.Run),
            Event("followed, later", 6, null, true, EventCategory.Retreat),
            Event("followed and interest", 4, null, true, EventCategory.Run),
            Event("elsewhere, followed", 1, "durham", true, EventCategory.Run),
        ];

        var ranked = HomeSuggestions.Rank(events, "scarborough", [Followed], [EventCategory.Run]);

        Assert.Equal(
            ["followed and interest", "followed, later", "interest, sooner", "interest, later", "rest, soonest", "elsewhere, followed"],
            ranked.Select(e => e.Title));
    }
}
