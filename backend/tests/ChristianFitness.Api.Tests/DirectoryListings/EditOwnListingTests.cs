using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-079 AC1 and AC2 (journey 20; ADR 0093): the profile tells the member who owns a listing that
/// they do, and gives only them the fields the owner's editor opens on.
/// </summary>
[Collection(DirectoryFixture.Name)]
public sealed class EditOwnListingTests(DirectoryFactory factory)
{
    internal static async Task<(string Cookie, Guid Id)> MemberAsync(DirectoryFactory factory, string email)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        return (cookie, await OwnProfileTests.MemberIdAsync(client, cookie));
    }

    [Fact]
    public async Task Given_a_member_who_owns_a_listing_When_they_read_its_profile_Then_it_says_they_own_it_with_the_editor_s_own_fields()
    {
        await factory.ClearAsync();
        var (cookie, owner) = await MemberAsync(factory, "eastside.owner-read@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Organization, "Eastside Ladies Who Lift");
        await factory.OwnAsync(listing, owner);

        var (status, profile) = await ListingProfileTests.ReadAsync(factory, listing, cookie);

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.True(profile.GetProperty("isOwner").GetBoolean());
        var own = profile.GetProperty("owner");
        Assert.Equal(["contactEmail", "pendingKind", "pendingName"], own.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(JsonValueKind.Null, own.GetProperty("contactEmail").ValueKind);
        Assert.Equal(JsonValueKind.Null, own.GetProperty("pendingName").ValueKind);
        Assert.Equal(JsonValueKind.Null, own.GetProperty("pendingKind").ValueKind);
    }

    [Fact]
    public async Task Given_a_listing_someone_else_owns_When_another_member_or_a_visitor_reads_it_Then_it_is_not_theirs_and_carries_no_owner_fields()
    {
        await factory.ClearAsync();
        var (_, owner) = await MemberAsync(factory, "eastside.owner-other@example.org");
        var (grace, _) = await MemberAsync(factory, "grace.not-owner@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Organization, "Eastside Ladies Who Lift");
        await factory.OwnAsync(listing, owner);

        foreach (var cookie in new[] { grace, null })
        {
            var (_, profile) = await ListingProfileTests.ReadAsync(factory, listing, cookie);

            Assert.False(profile.GetProperty("isOwner").GetBoolean());
            Assert.Equal(JsonValueKind.Null, profile.GetProperty("owner").ValueKind);
        }
    }
}
