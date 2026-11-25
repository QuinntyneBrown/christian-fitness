using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-054 AC7 and L2-036 AC2 (journey 5; ADR 0082): the directory answers 50 listings at a time and
/// the opaque cursor of the next page, which continues in kind and name order across kinds, with
/// the kind and search it was asked with; the last page has none, and a cursor the API did not
/// write is refused with <c>cursor_invalid</c>.
/// </summary>
[Collection(DirectoryFixture.Name)]
public sealed class PageDirectoryTests(DirectoryFactory factory)
{
    private static string Name(int n) => $"Club {n.ToString("D3", CultureInfo.InvariantCulture)}";

    private async Task AddClubsAndPeopleAsync()
    {
        await factory.ClearAsync();
        for (var n = 55; n >= 1; n--)
        {
            await factory.AddListingAsync(ListingKind.Organization, Name(n), area: n % 2 == 0 ? "Etobicoke" : "Scarborough");
        }

        await factory.AddListingAsync(ListingKind.Person, "Rev. James Whitfield", area: "Etobicoke");
        await factory.AddListingAsync(ListingKind.Company, "Kingdom Fuel Nutrition", area: "Mississauga");
    }

    private static string? CursorOf(JsonElement answer) => answer.GetProperty("nextCursor").GetString();

    [Fact]
    public async Task Given_57_listings_When_the_directory_is_read_page_by_page_Then_each_page_holds_50_in_order_and_the_last_has_no_cursor()
    {
        await AddClubsAndPeopleAsync();

        var first = await BrowseDirectoryTests.ReadAsync(factory);
        var cursor = CursorOf(first);
        Assert.NotNull(cursor);
        var second = await BrowseDirectoryTests.ReadAsync(factory, $"?cursor={Uri.EscapeDataString(cursor)}");

        Assert.Equal(Enumerable.Range(1, 50).Select(Name), BrowseDirectoryTests.NamesOf(first));
        Assert.Equal([.. Enumerable.Range(51, 5).Select(Name), "Rev. James Whitfield", "Kingdom Fuel Nutrition"], BrowseDirectoryTests.NamesOf(second));
        Assert.Null(CursorOf(second));
        Assert.Equal(55, BrowseDirectoryTests.CountsOf(second)["organization"]);
    }

    [Fact]
    public async Task Given_exactly_50_listings_When_the_directory_is_read_Then_there_is_no_next_page()
    {
        await factory.ClearAsync();
        for (var n = 1; n <= 50; n++)
        {
            await factory.AddListingAsync(ListingKind.Instructor, Name(n));
        }

        var answer = await BrowseDirectoryTests.ReadAsync(factory);

        Assert.Equal(50, BrowseDirectoryTests.NamesOf(answer).Length);
        Assert.Null(CursorOf(answer));
    }

    [Fact]
    public async Task Given_a_kind_and_a_search_When_the_next_page_is_read_with_them_Then_it_continues_within_them()
    {
        await AddClubsAndPeopleAsync();
        for (var n = 56; n <= 110; n++)
        {
            await factory.AddListingAsync(ListingKind.Organization, Name(n), area: n % 2 == 0 ? "Etobicoke" : "Scarborough");
        }

        var first = await BrowseDirectoryTests.ReadAsync(factory, "?kind=organization&q=etobicoke");
        var second = await BrowseDirectoryTests.ReadAsync(factory, $"?kind=organization&q=etobicoke&cursor={Uri.EscapeDataString(CursorOf(first)!)}");

        var evens = Enumerable.Range(1, 55).Select(i => Name(i * 2)).ToArray();
        Assert.Equal(evens[..50], BrowseDirectoryTests.NamesOf(first));
        Assert.Equal(evens[50..], BrowseDirectoryTests.NamesOf(second));
        Assert.Null(CursorOf(second));
    }

    [Fact]
    public async Task Given_listings_with_the_same_name_When_paged_Then_none_is_repeated_or_lost()
    {
        await factory.ClearAsync();
        var ids = new List<Guid>();
        for (var n = 0; n < 53; n++)
        {
            ids.Add(await factory.AddListingAsync(ListingKind.Ambassador, "Michael Chen"));
        }

        var first = await BrowseDirectoryTests.ReadAsync(factory);
        var second = await BrowseDirectoryTests.ReadAsync(factory, $"?cursor={Uri.EscapeDataString(CursorOf(first)!)}");

        var served = first.GetProperty("listings").EnumerateArray().Concat(second.GetProperty("listings").EnumerateArray())
            .Select(r => r.GetProperty("id").GetGuid()).ToList();
        Assert.Equal(ids.Order(), served.Order());
        Assert.Equal(53, served.Distinct().Count());
    }

    [Theory]
    [InlineData("not-a-cursor")]
    [InlineData("MXxjbHViIDAwMQ")]
    [InlineData("OXxjbHVifDAxOTNhOWMwLTAwMDAtNzAwMC04MDAwLTAwMDAwMDAwY2YwMQ")]
    [InlineData("%%%")]
    public async Task Given_a_cursor_the_API_did_not_write_When_it_is_sent_Then_it_is_refused_with_cursor_invalid(string cursor)
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{BrowseDirectoryTests.Path}?cursor={Uri.EscapeDataString(cursor)}", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("cursor_invalid", problem.GetProperty("fieldCodes").GetProperty("cursor").GetString());
    }
}
