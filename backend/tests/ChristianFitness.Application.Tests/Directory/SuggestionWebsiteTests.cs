using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Application.Tests.Directory;

/// <summary>
/// L2-062 AC7 (ADR 0086): how a suggested website is read. Blank is none; a value with no scheme
/// gets <c>https://</c> in front; only an https address whose host has a dot, with no user name and
/// no space, at most 200 characters once read, is one. One case per row.
/// </summary>
public sealed class SuggestionWebsiteTests
{
    [Theory]
    [InlineData(null, true, null)]
    [InlineData("   ", true, null)]
    [InlineData("instagram.com/eastsideladieslift", true, "https://instagram.com/eastsideladieslift")]
    [InlineData("  delaneyperformance.ca ", true, "https://delaneyperformance.ca")]
    [InlineData("https://example.com/club?day=sat", true, "https://example.com/club?day=sat")]
    [InlineData("HTTPS://Example.com", true, "HTTPS://Example.com")]
    [InlineData("http://example.com", false, null)]
    [InlineData("ftp://example.com", false, null)]
    [InlineData("javascript://alert(1)", false, null)]
    [InlineData("localhost/page", false, null)]
    [InlineData("https://me:secret@example.com", false, null)]
    [InlineData("my site.com", false, null)]
    [InlineData("https://", false, null)]
    public void Given_a_typed_website_When_it_is_read_Then_it_is_an_https_address_or_refused(string? typed, bool valid, string? expected)
    {
        Assert.Equal(valid, ListingSuggestion.TryReadWebsite(typed, out var website));
        Assert.Equal(expected, website);
    }

    [Theory]
    [InlineData(192, false)]
    [InlineData(193, true)]
    public void Given_a_website_without_a_scheme_When_its_length_is_judged_Then_it_counts_https_too(int typedLength, bool tooLong)
    {
        var typed = "example.com/" + new string('p', typedLength - "example.com/".Length);

        Assert.Equal(tooLong, ListingSuggestion.IsWebsiteTooLong(typed));
        Assert.Equal(!tooLong, ListingSuggestion.TryReadWebsite(typed, out _));
    }
}
