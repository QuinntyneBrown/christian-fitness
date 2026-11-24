using ChristianFitness.Domain.Services;

namespace ChristianFitness.Application.Tests.Services;

/// <summary>
/// L2-014 AC2 (ADR 0000): a contact link is an absolute http or https address, at most 2,000
/// characters, with no sign-in details in it; blank clears it. The same rows as <c>contact-link.spec.ts</c>.
/// </summary>
public sealed class ServiceListingContactUrlTests
{
    private static ServiceListing Listing()
    {
        var now = new DateTimeOffset(2026, 3, 12, 15, 0, 0, TimeSpan.Zero);
        var application = ProfessionalApplication.Submit(Guid.NewGuid(), "Dietitian", ServiceCategory.Nutrition, "RD", "Virtual", "$95", "About.", now);
        Assert.True(application.TryApprove("Marcus Lee", now, out var listing));
        return listing!;
    }

    [Theory]
    [InlineData("https://marcus.example.org/book", true)]
    [InlineData("http://marcus.example.org", true)]
    [InlineData("HTTPS://Marcus.Example.org/Book?x=1#top", true)]
    [InlineData("  https://marcus.example.org/book  ", true)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("data:text/html,hi", false)]
    [InlineData("mailto:marcus@example.org", false)]
    [InlineData("ftp://marcus.example.org", false)]
    [InlineData("//marcus.example.org", false)]
    [InlineData("marcus.example.org", false)]
    [InlineData("https://user:secret@marcus.example.org", false)]
    [InlineData("https://", false)]
    public void Given_an_address_When_set_Then_only_absolute_http_and_https_are_kept(string url, bool accepted)
    {
        var listing = Listing();

        Assert.Equal(accepted, listing.TrySetContactUrl(url));
        Assert.Equal(accepted ? url.Trim() : null, listing.ContactUrl);
    }

    [Fact]
    public void Given_an_address_over_2000_characters_When_set_Then_it_is_refused()
    {
        var listing = Listing();

        Assert.False(listing.TrySetContactUrl("https://marcus.example.org/" + new string('a', ServiceListing.ContactUrlMaxLength)));
        Assert.Null(listing.ContactUrl);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Given_a_contact_link_When_set_blank_Then_it_is_cleared(string? blank)
    {
        var listing = Listing();
        Assert.True(listing.TrySetContactUrl("https://marcus.example.org"));

        Assert.True(listing.TrySetContactUrl(blank));
        Assert.Null(listing.ContactUrl);
    }
}
