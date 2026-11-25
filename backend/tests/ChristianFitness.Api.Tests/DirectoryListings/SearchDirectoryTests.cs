using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-054 AC4 and AC5 (journey 5; ADR 0077, ADR 0082): <c>GET /api/directory?q=</c> lists the
/// published listings whose name, tagline, area or focus contain the search, ignoring case and
/// accents, combined with the kind; a search under 2 characters is none; one over 100 is refused
/// with <c>query_too_long</c>; the counts never change with the search.
/// </summary>
[Collection(DirectoryFixture.Name)]
public sealed class SearchDirectoryTests(DirectoryFactory factory)
{
    private async Task AddCastAsync()
    {
        await factory.ClearAsync();
        await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship", "Sunrise runs along the lake", "Etobicoke", ["Running"]);
        await factory.AddListingAsync(ListingKind.Organization, "Éclat Athletics", "Track nights for every pace", "Scarborough", ["Track"]);
        await factory.AddListingAsync(ListingKind.Instructor, "Danielle Okafor", "Strength coach for women", "Mississauga", ["Strength", "Aquafit"]);
        await factory.AddListingAsync(ListingKind.Instructor, "Tasha Grant", "Mobility and recovery", "North York", ["Mobility"]);
        await factory.AddListingAsync(ListingKind.ChurchMinistry, "Grace Fellowship Move Ministry", "Walks after Sunday service", "Brampton", ["Walking"]);
        await factory.AddListingAsync(ListingKind.Company, "Lakeview Draft Co.", "Never shown", "Etobicoke", ["Running"], ListingStatus.Draft);
    }

    // One row per case: what is searched, and the names that match, in the directory's order.
    [Theory]
    [InlineData("lakeshore", new[] { "Lakeshore Runners Fellowship" })]
    [InlineData("LAKESHORE", new[] { "Lakeshore Runners Fellowship" })]
    [InlineData("fellowship", new[] { "Lakeshore Runners Fellowship", "Grace Fellowship Move Ministry" })]
    [InlineData("eclat", new[] { "Éclat Athletics" })]
    [InlineData("ÉCLAT", new[] { "Éclat Athletics" })]
    [InlineData("track nights", new[] { "Éclat Athletics" })]
    [InlineData("mississauga", new[] { "Danielle Okafor" })]
    [InlineData("aquafit", new[] { "Danielle Okafor" })]
    [InlineData("  tasha  ", new[] { "Tasha Grant" })]
    [InlineData("ru", new[] { "Lakeshore Runners Fellowship" })]
    [InlineData("n%", new string[0])]
    [InlineData("r_n", new string[0])]
    [InlineData("zumba", new string[0])]
    [InlineData("draft", new string[0])]
    public async Task Given_listings_When_a_search_is_asked_for_Then_those_whose_name_tagline_area_or_focus_contain_it_are_listed(string q, string[] names)
    {
        await AddCastAsync();

        var answer = await BrowseDirectoryTests.ReadAsync(factory, $"?q={Uri.EscapeDataString(q)}");

        Assert.Equal(names, BrowseDirectoryTests.NamesOf(answer));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("l")]
    [InlineData(" é ")]
    public async Task Given_a_search_under_two_characters_When_it_is_asked_for_Then_every_listing_is_listed(string q)
    {
        await AddCastAsync();

        var answer = await BrowseDirectoryTests.ReadAsync(factory, $"?q={Uri.EscapeDataString(q)}");

        Assert.Equal(5, BrowseDirectoryTests.NamesOf(answer).Length);
    }

    [Fact]
    public async Task Given_a_search_and_a_kind_When_both_are_asked_for_Then_they_combine_and_the_counts_ignore_the_search()
    {
        await AddCastAsync();

        var answer = await BrowseDirectoryTests.ReadAsync(factory, "?kind=organization&q=fellowship");

        Assert.Equal(["Lakeshore Runners Fellowship"], BrowseDirectoryTests.NamesOf(answer));
        Assert.Equal(
            new Dictionary<string, int>(StringComparer.Ordinal)
            {
                ["organization"] = 2, ["person"] = 0, ["instructor"] = 2, ["ambassador"] = 0, ["company"] = 0, ["church-ministry"] = 1,
            },
            BrowseDirectoryTests.CountsOf(answer));
    }

    [Fact]
    public async Task Given_a_search_of_100_characters_When_it_is_asked_for_Then_it_is_answered()
    {
        await AddCastAsync();

        var answer = await BrowseDirectoryTests.ReadAsync(factory, $"?q={new string('x', 100)}");

        Assert.Empty(BrowseDirectoryTests.NamesOf(answer));
    }

    [Theory]
    [InlineData(101)]
    [InlineData(500)]
    public async Task Given_a_search_over_100_characters_When_it_is_asked_for_Then_it_is_refused_with_query_too_long(int length)
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{BrowseDirectoryTests.Path}?q={new string('x', length)}", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("query_too_long", problem.GetProperty("code").GetString());
    }
}
