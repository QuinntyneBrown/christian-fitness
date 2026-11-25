using ChristianFitness.Application.Events;

namespace ChristianFitness.Application.Tests.Events;

/// <summary>
/// L2-075 AC2 and AC3 (ADR 0081): the same rows as <c>event-list-query.spec.ts</c>. The search is
/// trimmed and blank text is no search; the API then compares it in lower case.
/// </summary>
public sealed class EventSearchTests
{
    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("   ", null)]
    [InlineData("\t \n", null)]
    [InlineData("yoga", "yoga")]
    [InlineData("  Sunrise 5K ", "sunrise 5k")]
    [InlineData("HOOPS & Devotion", "hoops & devotion")]
    [InlineData("100%", "100%")]
    public void Given_search_text_When_its_term_is_read_Then_it_is_trimmed_lower_case_or_none_when_blank(string? text, string? term)
    {
        Assert.Equal(term, EventSearch.TermOf(text));
    }
}
