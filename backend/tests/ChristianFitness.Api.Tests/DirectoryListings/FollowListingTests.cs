using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-056 AC1, AC2, AC4 and AC6 (journey 8; ADR 0088): <c>PUT /api/directory/{id}/follow</c> follows a
/// published listing and <c>DELETE</c> stops following it, each answering only the caller's state and
/// the count; repeating either changes nothing; the profile and the directory row say whether the
/// caller follows it and the profile counts its followers; anything but a published listing is 404
/// <c>listing_not_found</c>; and only a signed-in member may follow.
/// </summary>
[Collection(DirectoryFixture.Name)]
public sealed class FollowListingTests(DirectoryFactory factory)
{
    internal static async Task<string> MemberAsync(ApiFactory factory, string email)
    {
        using var client = Browser.CreateClient(factory);
        return await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
    }

    internal static async Task<(HttpStatusCode Status, JsonElement Body)> SendAsync(ApiFactory factory, HttpMethod method, Guid listing, string? cookie)
    {
        using var client = Browser.CreateClient(factory);
        using var response = await Browser.SendAsync(client, method, $"{BrowseDirectoryTests.Path}/{listing}/follow", cookie);
        var body = response.Content.Headers.ContentLength is 0
            ? default
            : await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return (response.StatusCode, body);
    }

    private Task<(HttpStatusCode Status, JsonElement Body)> FollowAsync(Guid listing, string? cookie) => SendAsync(factory, HttpMethod.Put, listing, cookie);

    private Task<(HttpStatusCode Status, JsonElement Body)> UnfollowAsync(Guid listing, string? cookie) => SendAsync(factory, HttpMethod.Delete, listing, cookie);

    private async Task<JsonElement> ProfileAsync(Guid listing, string? cookie)
    {
        using var client = Browser.CreateClient(factory);
        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{BrowseDirectoryTests.Path}/{listing}", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private async Task<JsonElement> RowAsync(Guid listing, string? cookie)
    {
        using var client = Browser.CreateClient(factory);
        using var response = await Browser.SendAsync(client, HttpMethod.Get, BrowseDirectoryTests.Path, cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return page.GetProperty("listings").EnumerateArray().Single(row => row.GetProperty("id").GetGuid() == listing);
    }

    private static void AssertAnswer(JsonElement body, bool following, int followers)
    {
        Assert.Equal(["following", "followers"], body.EnumerateObject().Select(p => p.Name));
        Assert.Equal(following, body.GetProperty("following").GetBoolean());
        Assert.Equal(followers, body.GetProperty("followers").GetInt32());
    }

    [Fact]
    public async Task Given_a_listing_the_member_does_not_follow_When_they_follow_it_Then_they_follow_it_and_its_count_rises_by_one()
    {
        await factory.ClearAsync();
        var grace = await MemberAsync(factory, "grace.follow@example.org");
        var david = await MemberAsync(factory, "david.follow@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");
        Assert.Equal(HttpStatusCode.OK, (await FollowAsync(listing, david)).Status);

        var (status, body) = await FollowAsync(listing, grace);

        Assert.Equal(HttpStatusCode.OK, status);
        AssertAnswer(body, following: true, followers: 2);
        var profile = await ProfileAsync(listing, grace);
        Assert.True(profile.GetProperty("following").GetBoolean());
        Assert.Equal(2, profile.GetProperty("followers").GetInt32());
        Assert.True((await RowAsync(listing, grace)).GetProperty("following").GetBoolean());
    }

    [Fact]
    public async Task Given_a_listing_the_member_follows_When_they_unfollow_it_Then_they_stop_following_and_its_count_falls_by_one()
    {
        await factory.ClearAsync();
        var grace = await MemberAsync(factory, "grace.unfollow@example.org");
        var david = await MemberAsync(factory, "david.unfollow@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Instructor, "Danielle Okafor");
        await FollowAsync(listing, david);
        await FollowAsync(listing, grace);

        var (status, body) = await UnfollowAsync(listing, grace);

        Assert.Equal(HttpStatusCode.OK, status);
        AssertAnswer(body, following: false, followers: 1);
        var profile = await ProfileAsync(listing, grace);
        Assert.False(profile.GetProperty("following").GetBoolean());
        Assert.Equal(1, profile.GetProperty("followers").GetInt32());
        Assert.False((await RowAsync(listing, grace)).GetProperty("following").GetBoolean());
        Assert.True((await RowAsync(listing, david)).GetProperty("following").GetBoolean());
    }

    [Fact]
    public async Task Given_a_follow_When_it_is_sent_twice_or_an_unfollow_of_a_listing_not_followed_Then_each_succeeds_and_changes_nothing()
    {
        await factory.ClearAsync();
        var grace = await MemberAsync(factory, "grace.twice@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Company, "Northline Athletic");

        var (neverStatus, never) = await UnfollowAsync(listing, grace);
        await FollowAsync(listing, grace);
        var (againStatus, again) = await FollowAsync(listing, grace);

        Assert.Equal(HttpStatusCode.OK, neverStatus);
        AssertAnswer(never, following: false, followers: 0);
        Assert.Equal(HttpStatusCode.OK, againStatus);
        AssertAnswer(again, following: true, followers: 1);
        Assert.Equal(1, (await ProfileAsync(listing, grace)).GetProperty("followers").GetInt32());
    }

    [Fact]
    public async Task Given_an_anonymous_reader_When_they_read_the_profile_and_the_row_Then_following_is_false_and_only_the_count_is_given()
    {
        await factory.ClearAsync();
        var grace = await MemberAsync(factory, "grace.anonymous-read@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Organization, "Christian Fitness");
        await FollowAsync(listing, grace);

        var profile = await ProfileAsync(listing, cookie: null);
        var row = await RowAsync(listing, cookie: null);

        Assert.False(profile.GetProperty("following").GetBoolean());
        Assert.Equal(1, profile.GetProperty("followers").GetInt32());
        Assert.False(row.GetProperty("following").GetBoolean());
        Assert.DoesNotContain(profile.EnumerateObject(), p => p.Name.Contains("member", StringComparison.OrdinalIgnoreCase) || p.Name == "follows");
    }

    [Theory]
    [InlineData(ListingStatus.Draft)]
    [InlineData(ListingStatus.Declined)]
    [InlineData(ListingStatus.Removed)]
    public async Task Given_a_listing_that_is_not_published_When_a_member_follows_or_unfollows_it_Then_it_is_refused_listing_not_found(ListingStatus status)
    {
        await factory.ClearAsync();
        var grace = await MemberAsync(factory, $"grace.follow-{status}@example.org".ToLowerInvariant());
        var listing = await factory.AddListingAsync(ListingKind.Organization, "Hidden Club", status: status);

        var (followStatus, follow) = await FollowAsync(listing, grace);
        var (unfollowStatus, unfollow) = await UnfollowAsync(listing, grace);

        Assert.Equal(HttpStatusCode.NotFound, followStatus);
        Assert.Equal("listing_not_found", follow.GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.NotFound, unfollowStatus);
        Assert.Equal("listing_not_found", unfollow.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_an_unknown_listing_When_a_member_follows_it_Then_it_is_refused_listing_not_found()
    {
        var grace = await MemberAsync(factory, "grace.follow-unknown@example.org");

        var (status, body) = await FollowAsync(Guid.CreateVersion7(), grace);

        Assert.Equal(HttpStatusCode.NotFound, status);
        Assert.Equal("listing_not_found", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_no_session_When_someone_follows_or_unfollows_Then_it_is_refused_401()
    {
        await factory.ClearAsync();
        var listing = await factory.AddListingAsync(ListingKind.Organization, "Christian Fitness");

        Assert.Equal(HttpStatusCode.Unauthorized, (await FollowAsync(listing, cookie: null)).Status);
        Assert.Equal(HttpStatusCode.Unauthorized, (await UnfollowAsync(listing, cookie: null)).Status);
        Assert.Equal(0, (await ProfileAsync(listing, cookie: null)).GetProperty("followers").GetInt32());
    }
}
