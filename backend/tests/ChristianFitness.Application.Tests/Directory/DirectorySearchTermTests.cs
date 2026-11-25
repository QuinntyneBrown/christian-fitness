using ChristianFitness.Application.Directory;

namespace ChristianFitness.Application.Tests.Directory;

/// <summary>
/// L2-054 AC4 (ADR 0077, ADR 0082): the search a text asks for, trimmed, none under 2 characters,
/// folded for matching. The rows are those of <c>directory-filter.spec.ts</c> in the domain library,
/// which applies the same rule before sending.
/// </summary>
public sealed class DirectorySearchTermTests
{
    [Theory]
    [InlineData(null, null)]
    [InlineData("   ", null)]
    [InlineData("a", null)]
    [InlineData("  a  ", null)]
    [InlineData("ab", "ab")]
    [InlineData(" ab ", "ab")]
    [InlineData("é ", null)]
    [InlineData("ét", "et")]
    [InlineData("faith & footwork", "faith & footwork")]
    [InlineData("ÉCLAT Athletics", "eclat athletics")]
    public void Given_a_typed_search_When_it_is_read_Then_it_is_the_folded_term_or_none(string? q, string? expected) =>
        Assert.Equal(expected, ListDirectoryRules.SearchTermOf(q));

    [Fact]
    public void Given_100_characters_When_read_Then_they_are_searched() =>
        Assert.Equal(new string('x', 100), ListDirectoryRules.SearchTermOf(new string('x', 100)));
}
