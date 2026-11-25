using ChristianFitness.Application.Events;

namespace ChristianFitness.Application.Tests.Events;

/// <summary>
/// L2-076 AC1 and AC3 (ADR 0081): the same rows as <c>event-list-query.spec.ts</c>. Only the exact
/// value <c>true</c> turns "Only events I'm going to" on; anything else leaves the list unrestricted.
/// </summary>
public sealed class ListEventsGoingTests
{
    [Theory]
    [InlineData(null, false)]
    [InlineData("", false)]
    [InlineData("true", true)]
    [InlineData("True", false)]
    [InlineData("1", false)]
    [InlineData("false", false)]
    [InlineData(" true ", false)]
    public void Given_a_going_value_When_the_query_reads_it_Then_only_exactly_true_turns_the_filter_on(string? going, bool on)
    {
        Assert.Equal(on, new ListEventsQuery(null, going: going).Going);
    }
}
