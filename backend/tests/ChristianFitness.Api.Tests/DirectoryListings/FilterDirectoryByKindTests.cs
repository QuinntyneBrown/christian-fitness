using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-054 AC3 (journey 5; ADR 0071, ADR 0082): <c>GET /api/directory?kind=</c> lists one kind in
/// name order while the counts still cover every kind; a kind the API does not know is refused
/// with <c>kind_invalid</c>.
/// </summary>
[Collection(DirectoryFixture.Name)]
public sealed class FilterDirectoryByKindTests(DirectoryFactory factory)
{
    private async Task AddCastAsync()
    {
        await factory.ClearAsync();
        await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");
        await factory.AddListingAsync(ListingKind.Instructor, "Tasha Grant");
        await factory.AddListingAsync(ListingKind.Instructor, "Danielle Okafor");
        await factory.AddListingAsync(ListingKind.Instructor, "Aaron Draft", status: ListingStatus.Draft);
        await factory.AddListingAsync(ListingKind.ChurchMinistry, "St. Paul's Bloor Street");
        await factory.AddListingAsync(ListingKind.Person, "Rev. James Whitfield");
    }

    [Theory]
    [InlineData("instructor", new[] { "Danielle Okafor", "Tasha Grant" })]
    [InlineData("church-ministry", new[] { "St. Paul's Bloor Street" })]
    [InlineData("organization", new[] { "Lakeshore Runners Fellowship" })]
    [InlineData("company", new string[0])]
    public async Task Given_listings_of_several_kinds_When_one_kind_is_asked_for_Then_only_it_is_listed_and_every_kind_is_still_counted(string kind, string[] names)
    {
        await AddCastAsync();

        var answer = await BrowseDirectoryTests.ReadAsync(factory, $"?kind={kind}");

        Assert.Equal(names, BrowseDirectoryTests.NamesOf(answer));
        Assert.Equal(
            new Dictionary<string, int>(StringComparer.Ordinal)
            {
                ["organization"] = 1, ["person"] = 1, ["instructor"] = 2, ["ambassador"] = 0, ["company"] = 0, ["church-ministry"] = 1,
            },
            BrowseDirectoryTests.CountsOf(answer));
    }

    [Theory]
    [InlineData("Instructor")]
    [InlineData("instructors")]
    [InlineData("Church Ministry")]
    [InlineData("ChurchMinistry")]
    [InlineData("2")]
    public async Task Given_a_kind_the_API_does_not_know_When_it_is_asked_for_Then_it_is_refused_with_kind_invalid(string kind)
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{BrowseDirectoryTests.Path}?kind={Uri.EscapeDataString(kind)}", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal("kind_invalid", problem.GetProperty("fieldCodes").GetProperty("kind").GetString());
    }
}
