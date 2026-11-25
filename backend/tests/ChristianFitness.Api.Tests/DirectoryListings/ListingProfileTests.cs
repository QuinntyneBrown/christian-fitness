using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-055 AC1 to AC5, AC7 and AC9 (journey 6; ADR 0087): <c>GET /api/directory/{id}</c> answers a
/// published listing's profile, with what it publishes and nothing else; a listing that is not
/// published, or not there, is 404 <c>listing_not_found</c>.
/// </summary>
[Collection(DirectoryFixture.Name)]
public sealed class ListingProfileTests(DirectoryFactory factory)
{
    internal static async Task<(HttpStatusCode Status, JsonElement Body)> ReadAsync(DirectoryFactory factory, Guid id, string? cookie = null)
    {
        using var client = Browser.CreateClient(factory);
        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{BrowseDirectoryTests.Path}/{id}", cookie);
        return (response.StatusCode, await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_a_published_listing_When_its_profile_is_read_Then_it_carries_what_the_profile_shows_and_nothing_else()
    {
        await factory.ClearAsync();
        var id = await factory.AddListingAsync(
            ListingKind.Organization,
            "Lakeshore <b>Runners</b> Fellowship",
            "Beginner-friendly running club with a prayer at every finish",
            "Etobicoke",
            ["Running", "Beginners", "Race training"],
            verified: true,
            description: "A west-end run club started by three neighbours in 2019.",
            website: "https://lakeshorerunners.ca",
            listedAt: new DateTimeOffset(2025, 3, 4, 12, 0, 0, TimeSpan.Zero));

        var (status, profile) = await ReadAsync(factory, id);

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal(
            ["area", "connections", "description", "focus", "followers", "following", "hasOwner", "hosting", "hostingCount", "id", "isVerified", "kind", "listedYear", "name", "photoKey", "serviceListingId", "tagline", "websiteUrl"],
            profile.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(id, profile.GetProperty("id").GetGuid());
        Assert.Equal("organization", profile.GetProperty("kind").GetString());
        Assert.Equal("Lakeshore <b>Runners</b> Fellowship", profile.GetProperty("name").GetString());
        Assert.Equal("Beginner-friendly running club with a prayer at every finish", profile.GetProperty("tagline").GetString());
        Assert.Equal("Etobicoke", profile.GetProperty("area").GetString());
        Assert.Equal("A west-end run club started by three neighbours in 2019.", profile.GetProperty("description").GetString());
        Assert.Equal(["Running", "Beginners", "Race training"], profile.GetProperty("focus").EnumerateArray().Select(f => f.GetString()!));
        Assert.Equal("https://lakeshorerunners.ca", profile.GetProperty("websiteUrl").GetString());
        Assert.True(profile.GetProperty("isVerified").GetBoolean());
        Assert.Equal(JsonValueKind.Null, profile.GetProperty("photoKey").ValueKind);
        Assert.Equal(0, profile.GetProperty("followers").GetInt32());
        Assert.Equal(2025, profile.GetProperty("listedYear").GetInt32());
    }

    [Fact]
    public async Task Given_a_listing_published_on_new_years_eve_in_Toronto_When_its_profile_is_read_Then_the_year_listed_is_Toronto_s()
    {
        await factory.ClearAsync();
        // 2025-01-01 03:00 UTC is still 31 December 2024 in Toronto.
        var id = await factory.AddListingAsync(ListingKind.Person, "Rev. James Whitfield", listedAt: new DateTimeOffset(2025, 1, 1, 3, 0, 0, TimeSpan.Zero));

        var (_, profile) = await ReadAsync(factory, id);

        Assert.Equal(2024, profile.GetProperty("listedYear").GetInt32());
    }

    [Fact]
    public async Task Given_events_a_listing_hosts_When_its_profile_is_read_Then_Hosting_lists_its_published_events_still_to_come_in_date_order()
    {
        await factory.ClearAsync();
        var club = await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");
        var other = await factory.AddListingAsync(ListingKind.Organization, "Faith & Footwork");
        var later = await factory.AddEventAsync(club, DirectoryFactory.Now.AddDays(9), title: "Harbourfront 10K");
        var sooner = await factory.AddEventAsync(club, DirectoryFactory.Now.AddMinutes(1), title: "Easter Sunrise 5K");
        await factory.AddEventAsync(club, DirectoryFactory.Now.AddDays(2), EventStatus.Draft, "Draft run");
        await factory.AddEventAsync(club, DirectoryFactory.Now.AddDays(3), EventStatus.Cancelled, "Cancelled run");
        await factory.AddEventAsync(club, DirectoryFactory.Now, title: "Starting now");
        await factory.AddEventAsync(club, DirectoryFactory.Now.AddDays(-1), title: "Yesterday's run");
        await factory.AddEventAsync(other, DirectoryFactory.Now.AddDays(1), title: "Someone else's run");

        var (_, profile) = await ReadAsync(factory, club);

        Assert.Equal(2, profile.GetProperty("hostingCount").GetInt32());
        var rows = profile.GetProperty("hosting").EnumerateArray().ToArray();
        Assert.Equal([sooner, later], rows.Select(r => r.GetProperty("id").GetGuid()));
        Assert.All(rows, row => Assert.Equal(
            ["category", "id", "imageKey", "place", "startsAt", "title"],
            row.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal)));
        Assert.Equal("Easter Sunrise 5K", rows[0].GetProperty("title").GetString());
        Assert.Equal("run", rows[0].GetProperty("category").GetString());
        Assert.Equal("Martin Goodman Trail", rows[0].GetProperty("place").GetString());
        Assert.Equal(DirectoryFactory.Now.AddMinutes(1), rows[0].GetProperty("startsAt").GetDateTimeOffset());
        Assert.Equal(JsonValueKind.Null, rows[0].GetProperty("imageKey").ValueKind);
    }

    [Fact]
    public async Task Given_a_listing_hosting_more_than_20_events_When_its_profile_is_read_Then_the_first_20_show_and_the_count_covers_all()
    {
        await factory.ClearAsync();
        var club = await factory.AddListingAsync(ListingKind.Organization, "St. Paul's Sports Ministry");
        for (var day = 1; day <= 21; day++)
        {
            await factory.AddEventAsync(club, DirectoryFactory.Now.AddDays(day), title: $"Run {day:00}");
        }

        var (_, profile) = await ReadAsync(factory, club);

        Assert.Equal(21, profile.GetProperty("hostingCount").GetInt32());
        Assert.Equal(
            Enumerable.Range(1, 20).Select(day => $"Run {day:00}"),
            profile.GetProperty("hosting").EnumerateArray().Select(r => r.GetProperty("title").GetString()!));
    }

    [Fact]
    public async Task Given_a_listing_hosting_nothing_still_to_come_When_its_profile_is_read_Then_Hosting_is_empty()
    {
        await factory.ClearAsync();
        var quiet = await factory.AddListingAsync(ListingKind.Company, "Northline Athletic");
        await factory.AddEventAsync(quiet, DirectoryFactory.Now.AddDays(-2));

        var (_, profile) = await ReadAsync(factory, quiet);

        Assert.Equal(0, profile.GetProperty("hostingCount").GetInt32());
        Assert.Empty(profile.GetProperty("hosting").EnumerateArray());
    }

    [Fact]
    public async Task Given_a_listing_connected_to_others_When_its_profile_is_read_Then_Connected_lists_the_published_ones_with_their_relation()
    {
        await factory.ClearAsync();
        var club = await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");
        var northline = await factory.AddListingAsync(ListingKind.Company, "Northline Athletic");
        var michael = await factory.AddListingAsync(ListingKind.Ambassador, "Michael <i>Chen</i>", photoKey: "0f8e1c2d3b4a59687766554433221100.jpg");
        var draft = await factory.AddListingAsync(ListingKind.Person, "Not Yet Listed", status: ListingStatus.Draft);
        var removed = await factory.AddListingAsync(ListingKind.Instructor, "Taken Down", status: ListingStatus.Removed);
        var fan = await factory.AddListingAsync(ListingKind.Person, "Points At The Club");
        await factory.AddConnectionAsync(club, northline, "Shoe partner");
        await factory.AddConnectionAsync(club, michael, "Run leader");
        await factory.AddConnectionAsync(club, draft, "Coach");
        await factory.AddConnectionAsync(club, removed, "Coach");
        await factory.AddConnectionAsync(fan, club, "Member");

        var (_, profile) = await ReadAsync(factory, club);

        var connections = profile.GetProperty("connections").EnumerateArray().ToArray();
        Assert.All(connections, c => Assert.Equal(
            ["id", "kind", "name", "photoKey", "relation"],
            c.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal)));
        Assert.Equal(
            [(michael, "ambassador", "Michael <i>Chen</i>", "Run leader"), (northline, "company", "Northline Athletic", "Shoe partner")],
            connections.Select(c => (c.GetProperty("id").GetGuid(), c.GetProperty("kind").GetString()!, c.GetProperty("name").GetString()!, c.GetProperty("relation").GetString()!)));
        Assert.Equal("0f8e1c2d3b4a59687766554433221100.jpg", connections[0].GetProperty("photoKey").GetString());
        Assert.Equal(JsonValueKind.Null, connections[1].GetProperty("photoKey").ValueKind);
    }

    [Fact]
    public async Task Given_a_listing_with_no_published_connection_When_its_profile_is_read_Then_Connected_is_empty()
    {
        await factory.ClearAsync();
        var club = await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");
        var draft = await factory.AddListingAsync(ListingKind.Person, "Not Yet Listed", status: ListingStatus.Draft);
        await factory.AddConnectionAsync(club, draft, "Coach");

        var (_, profile) = await ReadAsync(factory, club);

        Assert.Empty(profile.GetProperty("connections").EnumerateArray());
    }

    [Theory]
    [InlineData(ListingStatus.Draft)]
    [InlineData(ListingStatus.Declined)]
    [InlineData(ListingStatus.Removed)]
    public async Task Given_a_listing_that_is_not_published_When_its_profile_is_read_Then_it_is_refused_listing_not_found(ListingStatus status)
    {
        await factory.ClearAsync();
        var id = await factory.AddListingAsync(ListingKind.Organization, "Hidden Club", status: status);

        var (code, body) = await ReadAsync(factory, id);

        Assert.Equal(HttpStatusCode.NotFound, code);
        Assert.Equal("listing_not_found", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_no_listing_by_that_id_When_its_profile_is_read_Then_it_is_refused_listing_not_found()
    {
        await factory.ClearAsync();

        var (code, body) = await ReadAsync(factory, Guid.CreateVersion7());

        Assert.Equal(HttpStatusCode.NotFound, code);
        Assert.Equal("listing_not_found", body.GetProperty("code").GetString());
    }
}
