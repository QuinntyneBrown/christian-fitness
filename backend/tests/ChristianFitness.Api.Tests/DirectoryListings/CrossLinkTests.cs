using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// ADR 0061 and ADR 0085 (journey 6): a directory listing and a Services listing of the same member,
/// or that staff linked, name each other. The profile's <c>serviceListingId</c> leads to "Also offers
/// services"; a Services listing's <c>directoryListingId</c>, in the list and the detail, leads to
/// "Also in the directory", naming only a published listing, the oldest when several match.
/// </summary>
[Collection(DirectoryFixture.Name)]
public sealed class CrossLinkTests(DirectoryFactory factory)
{
    private async Task<(string Cookie, Guid Id)> MemberAsync(string email)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        return (cookie, await OwnProfileTests.MemberIdAsync(client, cookie));
    }

    private async Task<JsonElement> GetAsync(string path, string cookie)
    {
        using var client = Browser.CreateClient(factory);
        using var response = await Browser.SendAsync(client, HttpMethod.Get, path, cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private static Guid? IdOrNull(JsonElement body, string name) =>
        body.GetProperty(name).ValueKind == JsonValueKind.Null ? null : body.GetProperty(name).GetGuid();

    [Fact]
    public async Task Given_an_owner_also_listed_in_Services_When_the_profile_is_read_Then_it_names_the_Services_listing()
    {
        await factory.ClearAsync();
        var (_, danielle) = await MemberAsync("danielle.also-services@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Instructor, "Danielle Okafor");
        await factory.OwnAsync(listing, danielle);
        var service = await factory.AddServiceListingAsync(danielle, "Danielle Okafor");

        var (_, profile) = await ListingProfileTests.ReadAsync(factory, listing);

        Assert.Equal(service, IdOrNull(profile, "serviceListingId"));
    }

    [Fact]
    public async Task Given_staff_linked_a_Services_listing_When_the_profile_is_read_Then_it_names_it()
    {
        await factory.ClearAsync();
        var (_, marcus) = await MemberAsync("marcus.linked-services@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Organization, "Kingdom Fuel Nutrition");
        var service = await factory.AddServiceListingAsync(marcus, "Kingdom Fuel dietitians");
        await factory.LinkServiceAsync(listing, service);

        var (_, profile) = await ListingProfileTests.ReadAsync(factory, listing);

        Assert.Equal(service, IdOrNull(profile, "serviceListingId"));
    }

    [Fact]
    public async Task Given_no_Services_listing_or_a_link_to_one_since_removed_When_the_profile_is_read_Then_it_names_none()
    {
        await factory.ClearAsync();
        var (_, owner) = await MemberAsync("owner.no-services@example.org");
        var owned = await factory.AddListingAsync(ListingKind.Instructor, "Tasha Grant");
        await factory.OwnAsync(owned, owner);
        var stale = await factory.AddListingAsync(ListingKind.Organization, "Faith & Footwork");
        await factory.LinkServiceAsync(stale, Guid.CreateVersion7());

        var (_, ownedProfile) = await ListingProfileTests.ReadAsync(factory, owned);
        var (_, staleProfile) = await ListingProfileTests.ReadAsync(factory, stale);

        Assert.Null(IdOrNull(ownedProfile, "serviceListingId"));
        Assert.Null(IdOrNull(staleProfile, "serviceListingId"));
    }

    [Fact]
    public async Task Given_a_professional_also_in_the_directory_When_Services_is_read_Then_the_list_and_the_detail_name_the_oldest_published_listing()
    {
        await factory.ClearAsync();
        var (grace, _) = await MemberAsync("grace.also-directory@example.org");
        var (_, danielle) = await MemberAsync("danielle.also-directory@example.org");
        var (_, marcus) = await MemberAsync("marcus.also-directory@example.org");
        var (_, priya) = await MemberAsync("priya.also-directory@example.org");
        var newer = await factory.AddListingAsync(ListingKind.Instructor, "Danielle Okafor, bootcamps", listedAt: DirectoryFactory.Now.AddDays(-1));
        var older = await factory.AddListingAsync(ListingKind.Instructor, "Danielle Okafor", listedAt: DirectoryFactory.Now.AddDays(-30));
        var draft = await factory.AddListingAsync(ListingKind.Person, "Danielle Okafor, draft", status: ListingStatus.Draft, listedAt: DirectoryFactory.Now.AddDays(-60));
        foreach (var listing in new[] { newer, older, draft })
        {
            await factory.OwnAsync(listing, danielle);
        }

        var danielleService = await factory.AddServiceListingAsync(danielle, "Danielle Okafor");
        var linked = await factory.AddListingAsync(ListingKind.Company, "Kingdom Fuel Nutrition");
        var marcusService = await factory.AddServiceListingAsync(marcus, "Marcus Bell");
        await factory.LinkServiceAsync(linked, marcusService);
        var priyaService = await factory.AddServiceListingAsync(priya, "Priya Nair");

        var list = await GetAsync("/api/services", grace);
        var detail = await GetAsync($"/api/services/{danielleService}", grace);

        Assert.Equal(
            [(danielleService, (Guid?)older), (marcusService, linked), (priyaService, null)],
            list.GetProperty("services").EnumerateArray().Select(s => (s.GetProperty("id").GetGuid(), IdOrNull(s, "directoryListingId"))));
        Assert.Equal(older, IdOrNull(detail, "directoryListingId"));
    }
}
