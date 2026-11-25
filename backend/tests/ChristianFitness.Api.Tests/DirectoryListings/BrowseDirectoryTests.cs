using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-054 AC1, AC2 and AC8 (journey 5; ADR 0082): <c>GET /api/directory</c> answers the published
/// listings in kind order, each kind in name order, with the fields a row shows and its hosting
/// count; drafts, declined and removed listings are never listed and never counted.
/// </summary>
[Collection(DirectoryFixture.Name)]
public sealed class BrowseDirectoryTests(DirectoryFactory factory)
{
    internal const string Path = "/api/directory";

    internal static async Task<JsonElement> ReadAsync(DirectoryFactory factory, string query = "")
    {
        using var client = Browser.CreateClient(factory);
        using var response = await Browser.SendAsync(client, HttpMethod.Get, Path + query, null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    internal static string[] NamesOf(JsonElement answer) =>
        [.. answer.GetProperty("listings").EnumerateArray().Select(r => r.GetProperty("name").GetString()!)];

    internal static Dictionary<string, int> CountsOf(JsonElement answer) =>
        answer.GetProperty("counts").EnumerateArray().ToDictionary(c => c.GetProperty("kind").GetString()!, c => c.GetProperty("count").GetInt32(), StringComparer.Ordinal);

    [Fact]
    public async Task Given_published_listings_of_several_kinds_When_the_directory_is_read_Then_they_come_in_kind_order_and_name_order()
    {
        await factory.ClearAsync();
        await factory.AddListingAsync(ListingKind.ChurchMinistry, "Grace Fellowship Move Ministry");
        await factory.AddListingAsync(ListingKind.Person, "Rev. James Whitfield");
        await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");
        await factory.AddListingAsync(ListingKind.Instructor, "Tasha Grant");
        await factory.AddListingAsync(ListingKind.Organization, "christian Fitness");
        await factory.AddListingAsync(ListingKind.Company, "Kingdom Fuel Nutrition");
        await factory.AddListingAsync(ListingKind.Ambassador, "Michael Chen");
        await factory.AddListingAsync(ListingKind.Organization, "Éclat Athletics");
        await factory.AddListingAsync(ListingKind.Instructor, "Danielle Okafor");

        var answer = await ReadAsync(factory);

        Assert.Equal(["counts", "listings", "nextCursor"], answer.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(
            ["christian Fitness", "Éclat Athletics", "Lakeshore Runners Fellowship", "Rev. James Whitfield", "Danielle Okafor", "Tasha Grant", "Michael Chen", "Kingdom Fuel Nutrition", "Grace Fellowship Move Ministry"],
            NamesOf(answer));
        Assert.Equal(
            ["organization", "organization", "organization", "person", "instructor", "instructor", "ambassador", "company", "church-ministry"],
            answer.GetProperty("listings").EnumerateArray().Select(r => r.GetProperty("kind").GetString()!));
        Assert.Equal(JsonValueKind.Null, answer.GetProperty("nextCursor").ValueKind);
    }

    [Fact]
    public async Task Given_a_listing_When_its_row_is_read_Then_it_carries_what_the_row_shows_and_nothing_else()
    {
        await factory.ClearAsync();
        await factory.AddListingAsync(ListingKind.Instructor, "Danielle <b>Okafor</b>", "Strength for women returning to fitness", "East York", ["Strength"], verified: true, photoKey: "0f8e1c2d3b4a59687766554433221100.jpg");
        await factory.AddListingAsync(ListingKind.Company, "Northline Athletic", "Running shoes and gait analysis", "Roncesvalles");

        var rows = (await ReadAsync(factory)).GetProperty("listings").EnumerateArray().ToArray();

        Assert.All(rows, row => Assert.Equal(
            ["area", "following", "hosting", "id", "isVerified", "kind", "name", "photoKey", "tagline"],
            row.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal)));
        var danielle = rows[0];
        Assert.Equal("Danielle <b>Okafor</b>", danielle.GetProperty("name").GetString());
        Assert.Equal("Strength for women returning to fitness", danielle.GetProperty("tagline").GetString());
        Assert.Equal("East York", danielle.GetProperty("area").GetString());
        Assert.True(danielle.GetProperty("isVerified").GetBoolean());
        Assert.Equal("0f8e1c2d3b4a59687766554433221100.jpg", danielle.GetProperty("photoKey").GetString());
        Assert.Equal(0, danielle.GetProperty("hosting").GetInt32());
        var northline = rows[1];
        Assert.False(northline.GetProperty("isVerified").GetBoolean());
        Assert.Equal(JsonValueKind.Null, northline.GetProperty("photoKey").ValueKind);
    }

    [Fact]
    public async Task Given_draft_declined_and_removed_listings_When_the_directory_is_read_Then_only_published_ones_are_listed_and_counted()
    {
        await factory.ClearAsync();
        await factory.AddListingAsync(ListingKind.Organization, "Published Club");
        await factory.AddListingAsync(ListingKind.Organization, "Draft Club", status: ListingStatus.Draft);
        await factory.AddListingAsync(ListingKind.Person, "Declined Person", status: ListingStatus.Declined);
        await factory.AddListingAsync(ListingKind.Company, "Removed Company", status: ListingStatus.Removed);

        var answer = await ReadAsync(factory);

        Assert.Equal(["Published Club"], NamesOf(answer));
        Assert.Equal(
            new Dictionary<string, int>(StringComparer.Ordinal)
            {
                ["organization"] = 1, ["person"] = 0, ["instructor"] = 0, ["ambassador"] = 0, ["company"] = 0, ["church-ministry"] = 0,
            },
            CountsOf(answer));
        Assert.Equal(
            ["organization", "person", "instructor", "ambassador", "company", "church-ministry"],
            answer.GetProperty("counts").EnumerateArray().Select(c => c.GetProperty("kind").GetString()!));
    }

    [Fact]
    public async Task Given_hosted_events_When_the_directory_is_read_Then_each_row_counts_the_published_events_still_to_come()
    {
        await factory.ClearAsync();
        var club = await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");
        var quiet = await factory.AddListingAsync(ListingKind.Person, "Rev. James Whitfield");
        await factory.AddEventAsync(club, DirectoryFactory.Now.AddDays(3));
        await factory.AddEventAsync(club, DirectoryFactory.Now.AddMinutes(1));
        await factory.AddEventAsync(club, DirectoryFactory.Now.AddDays(4), EventStatus.Draft);
        await factory.AddEventAsync(club, DirectoryFactory.Now.AddDays(5), EventStatus.Cancelled);
        await factory.AddEventAsync(club, DirectoryFactory.Now);
        await factory.AddEventAsync(club, DirectoryFactory.Now.AddDays(-1));
        await factory.AddEventAsync(quiet, DirectoryFactory.Now.AddHours(-2));

        var rows = (await ReadAsync(factory)).GetProperty("listings").EnumerateArray().ToArray();

        Assert.Equal(
            [("Lakeshore Runners Fellowship", 2), ("Rev. James Whitfield", 0)],
            rows.Select(r => (r.GetProperty("name").GetString()!, r.GetProperty("hosting").GetInt32())));
    }

    [Fact]
    public async Task Given_a_listing_hosting_series_When_the_directory_is_read_Then_its_row_counts_each_listed_series_once_and_its_one_off_events()
    {
        await factory.ClearAsync();
        var club = await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");
        var later = DirectoryFactory.Now.AddDays(7);
        await factory.AddSeriesAsync(club, "Couch to 5K Run Club", (DirectoryFactory.Now.AddDays(-7), false), (DirectoryFactory.Now.AddDays(1), false), (later, false));
        await factory.AddSeriesAsync(club, "Finished Mobility", (DirectoryFactory.Now.AddDays(-7), false));
        await factory.AddSeriesAsync(club, "Only cancelled to come", (later, true));
        await factory.AddEventAsync(club, DirectoryFactory.Now.AddDays(2));

        var rows = (await ReadAsync(factory)).GetProperty("listings").EnumerateArray().ToArray();

        // One listed series (its two sessions to come count once) and one one-off event.
        Assert.Equal([("Lakeshore Runners Fellowship", 2)], rows.Select(r => (r.GetProperty("name").GetString()!, r.GetProperty("hosting").GetInt32())));
    }
}
