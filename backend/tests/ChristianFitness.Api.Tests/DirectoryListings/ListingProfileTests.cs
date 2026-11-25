using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-055 AC1, AC5, AC7 and AC9 (journey 6; ADR 0085): <c>GET /api/directory/{id}</c> answers a
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
            ["area", "description", "focus", "followers", "id", "isVerified", "kind", "listedYear", "name", "photoKey", "tagline", "websiteUrl"],
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
