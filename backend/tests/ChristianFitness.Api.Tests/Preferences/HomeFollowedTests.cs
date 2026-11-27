using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Home;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Preferences;

/// <summary>
/// L2-056 AC7, L2-065 AC7 (journey 34; ADR 0076, ADR 0116): a listing the member follows ranks its
/// new events ahead of the others in Home's suggestions. An event counts as new from when it was
/// published, after the member followed the listing, until the member has opened it.
/// </summary>
public sealed class HomeFollowedTests(HomeFactory factory) : IClassFixture<HomeFactory>
{
    [Fact]
    public async Task Given_a_followed_listing_When_Home_suggests_Then_only_its_events_published_since_the_follow_and_not_yet_seen_rank_first()
    {
        var listing = await AddListingAsync("Lakeshore Runners");
        // Published a day before the follow, so not new to the member.
        var before = await AddEventAsync("Before the follow", 3, listing, publishedAt: HomeFactory.Now.AddDays(-1));
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("grace.home.followed@example.org"));
        using (var followed = await Browser.SendAsync(client, HttpMethod.Put, $"/api/directory/{listing}/follow", cookie))
        {
            Assert.Equal(HttpStatusCode.OK, followed.StatusCode);
        }

        var later = HomeFactory.Now.AddHours(1);
        var fresh = await AddEventAsync("New since the follow", 5, listing, later);
        var seen = await AddEventAsync("New but opened", 2, listing, later);
        var other = await AddEventAsync("Not followed", 1, DirectoryListing.TeamListingId, later);
        using (var opened = await Browser.SendAsync(client, HttpMethod.Get, $"/api/events/{seen}", cookie))
        {
            Assert.Equal(HttpStatusCode.OK, opened.StatusCode);
        }

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/home", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var home = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        // None matches an interest: after the one new event, the rest go by date.
        Assert.Equal(
            [fresh, other, seen],
            home.GetProperty("suggested").EnumerateArray().Select(e => e.GetProperty("id").GetGuid()));
        Assert.DoesNotContain(before, home.GetProperty("suggested").EnumerateArray().Select(e => e.GetProperty("id").GetGuid()));
    }

    private async Task<Guid> AddListingAsync(string name)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var listing = DirectoryListing.CreateDraft(Guid.CreateVersion7(), ListingKind.Organization, name, "A tagline", "Etobicoke", [], HomeFactory.Now.AddDays(-60), string.Empty, null, false);
        listing.Publish(HomeFactory.Now.AddDays(-60));
        db.DirectoryListings.Add(listing);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return listing.Id;
    }

    private async Task<Guid> AddEventAsync(string title, int day, Guid host, DateTimeOffset publishedAt)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var e = Event.CreateDraft(title, EventCategory.Retreat, HomeFactory.Now.AddDays(day), "Marilyn Bell Park", "Waterfront, Toronto", 0, 50, "Come along.", HomeFactory.Now.AddDays(-30));
        e.HostedBy(host);
        e.Publish(publishedAt);
        db.Events.Add(e);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return e.Id;
    }
}
