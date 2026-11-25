using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-010 AC4 (journey 7; ADR 0088): a member's event carries its host listing, with its kind,
/// name, whether it is verified and its photo, so the page shows "Hosted by" and links to it. An
/// event keeps its host whatever the listing's status.
/// </summary>
[Collection(DirectoryFixture.Name)]
public sealed class EventHostedByTests(DirectoryFactory factory)
{
    private async Task<JsonElement> HostOfAsync(Guid eventId, string email)
    {
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, email);
        using (client)
        {
            using var response = await Browser.SendAsync(client, HttpMethod.Get, $"/api/events/{eventId}", cookie);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            return (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("host");
        }
    }

    [Fact]
    public async Task Given_an_event_hosted_by_a_verified_instructor_When_a_member_opens_it_Then_it_carries_exactly_the_host_card_s_fields()
    {
        var host = await factory.AddListingAsync(ListingKind.Instructor, "Danielle Okafor", verified: true, photoKey: "danielle.jpg");
        var e = await factory.AddEventAsync(host, DirectoryFactory.Now.AddDays(3));

        var card = await HostOfAsync(e, "grace.hostedby.verified@example.org");

        Assert.Equal(["id", "isVerified", "kind", "name", "photoKey"], card.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(host.ToString(), card.GetProperty("id").GetString());
        Assert.Equal("instructor", card.GetProperty("kind").GetString());
        Assert.Equal("Danielle Okafor", card.GetProperty("name").GetString());
        Assert.True(card.GetProperty("isVerified").GetBoolean());
        Assert.Equal("danielle.jpg", card.GetProperty("photoKey").GetString());
    }

    [Fact]
    public async Task Given_an_event_hosted_by_an_unverified_ministry_When_a_member_opens_it_Then_the_host_is_not_verified_and_has_no_photo()
    {
        var host = await factory.AddListingAsync(ListingKind.ChurchMinistry, "Grace Fellowship Movers");
        var e = await factory.AddEventAsync(host, DirectoryFactory.Now.AddDays(3));

        var card = await HostOfAsync(e, "grace.hostedby.unverified@example.org");

        Assert.Equal("church-ministry", card.GetProperty("kind").GetString());
        Assert.False(card.GetProperty("isVerified").GetBoolean());
        Assert.Equal(JsonValueKind.Null, card.GetProperty("photoKey").ValueKind);
    }

    [Fact]
    public async Task Given_a_member_registers_and_cancels_When_the_event_answers_Then_it_still_carries_its_host()
    {
        var host = await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship", verified: true);
        var e = await factory.AddEventAsync(host, DirectoryFactory.Now.AddDays(3));
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, "grace.hostedby.register@example.org");
        using (client)
        {
            foreach (var method in new[] { HttpMethod.Post, HttpMethod.Delete })
            {
                var path = method == HttpMethod.Post ? $"/api/events/{e}/registrations" : $"/api/events/{e}/registrations/me";
                using var response = await Browser.SendAsync(client, method, path, cookie);

                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                var answer = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
                Assert.Equal(host.ToString(), answer.GetProperty("host").GetProperty("id").GetString());
            }
        }
    }

    [Fact]
    public async Task Given_a_host_that_is_no_longer_Listed_When_a_member_opens_its_event_Then_the_event_still_names_it()
    {
        var host = await factory.AddListingAsync(ListingKind.Organization, "Northline Athletic", status: ListingStatus.Removed);
        var e = await factory.AddEventAsync(host, DirectoryFactory.Now.AddDays(3));

        var card = await HostOfAsync(e, "grace.hostedby.removed@example.org");

        Assert.Equal("Northline Athletic", card.GetProperty("name").GetString());
    }
}
