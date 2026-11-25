using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-055 AC6 and L2-014 AC1 to AC2 (journey 6; ADR 0085): the profile says whether a listing has an
/// owner, and <c>POST /api/directory/{id}/conversation</c> answers the owner's member id for the
/// direct conversation. A listing with no owner is 409 <c>listing_unreachable</c>; a suspended owner
/// and the caller's own listing are 403 <c>recipient_unavailable</c>; anything but a published listing
/// is 404 <c>listing_not_found</c>; and only a signed-in member may ask.
/// </summary>
[Collection(DirectoryFixture.Name)]
public sealed class ListingMessageTests(DirectoryFactory factory)
{
    private async Task<(string Cookie, Guid Id)> MemberAsync(string email)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        return (cookie, await OwnProfileTests.MemberIdAsync(client, cookie));
    }

    private async Task<(HttpStatusCode Status, JsonElement Body)> StartAsync(Guid listing, string? cookie)
    {
        using var client = Browser.CreateClient(factory);
        using var response = await Browser.SendAsync(client, HttpMethod.Post, $"{BrowseDirectoryTests.Path}/{listing}/conversation", cookie);
        var body = response.Content.Headers.ContentLength is 0
            ? default
            : await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return (response.StatusCode, body);
    }

    [Fact]
    public async Task Given_an_owned_listing_When_a_member_messages_it_Then_the_answer_is_the_owner_to_open_the_conversation_with()
    {
        await factory.ClearAsync();
        var (_, owner) = await MemberAsync("danielle.listing-dm@example.org");
        var (grace, _) = await MemberAsync("grace.listing-dm@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Instructor, "Danielle Okafor");
        await factory.OwnAsync(listing, owner);

        var (status, body) = await StartAsync(listing, grace);

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal(["memberId"], body.EnumerateObject().Select(p => p.Name));
        Assert.Equal(owner, body.GetProperty("memberId").GetGuid());
    }

    [Fact]
    public async Task Given_a_listing_with_no_owner_When_a_member_messages_it_Then_it_is_refused_listing_unreachable()
    {
        await factory.ClearAsync();
        var (grace, _) = await MemberAsync("grace.unreachable@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");

        var (status, body) = await StartAsync(listing, grace);

        Assert.Equal(HttpStatusCode.Conflict, status);
        Assert.Equal("listing_unreachable", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_listing_whose_owner_is_suspended_When_a_member_messages_it_Then_it_is_refused_recipient_unavailable()
    {
        await factory.ClearAsync();
        var (_, owner) = await MemberAsync("tyler.listing-suspended@example.org");
        var (grace, _) = await MemberAsync("grace.listing-suspended@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Instructor, "Tyler Brooks");
        await factory.OwnAsync(listing, owner);
        await factory.SuspendAsync(owner);

        var (status, body) = await StartAsync(listing, grace);

        Assert.Equal(HttpStatusCode.Forbidden, status);
        Assert.Equal("recipient_unavailable", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_the_callers_own_listing_When_they_message_it_Then_it_is_refused_recipient_unavailable()
    {
        await factory.ClearAsync();
        var (danielle, owner) = await MemberAsync("danielle.own-listing@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Instructor, "Danielle Okafor");
        await factory.OwnAsync(listing, owner);

        var (status, body) = await StartAsync(listing, danielle);

        Assert.Equal(HttpStatusCode.Forbidden, status);
        Assert.Equal("recipient_unavailable", body.GetProperty("code").GetString());
    }

    [Theory]
    [InlineData(ListingStatus.Draft)]
    [InlineData(ListingStatus.Declined)]
    [InlineData(ListingStatus.Removed)]
    public async Task Given_a_listing_that_is_not_published_When_a_member_messages_it_Then_it_is_refused_listing_not_found(ListingStatus listingStatus)
    {
        await factory.ClearAsync();
        var (_, owner) = await MemberAsync($"owner.{listingStatus}.listing-dm@example.org");
        var (grace, _) = await MemberAsync($"grace.{listingStatus}.listing-dm@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Instructor, "Not Listed", status: listingStatus);
        await factory.OwnAsync(listing, owner);

        var (status, body) = await StartAsync(listing, grace);

        Assert.Equal(HttpStatusCode.NotFound, status);
        Assert.Equal("listing_not_found", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_no_session_When_a_listing_is_messaged_Then_it_is_unauthorized()
    {
        await factory.ClearAsync();
        var listing = await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");

        var (status, _) = await StartAsync(listing, cookie: null);

        Assert.Equal(HttpStatusCode.Unauthorized, status);
    }

    [Fact]
    public async Task Given_listings_with_and_without_an_owner_When_their_profiles_are_read_Then_each_says_whether_it_can_be_messaged()
    {
        await factory.ClearAsync();
        var (_, owner) = await MemberAsync("danielle.has-owner@example.org");
        var owned = await factory.AddListingAsync(ListingKind.Instructor, "Danielle Okafor");
        await factory.OwnAsync(owned, owner);
        var unowned = await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");

        var (_, ownedProfile) = await ListingProfileTests.ReadAsync(factory, owned);
        var (_, unownedProfile) = await ListingProfileTests.ReadAsync(factory, unowned);

        Assert.True(ownedProfile.GetProperty("hasOwner").GetBoolean());
        Assert.False(unownedProfile.GetProperty("hasOwner").GetBoolean());
    }
}
