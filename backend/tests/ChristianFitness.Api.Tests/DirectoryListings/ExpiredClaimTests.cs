using System.Net;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Directory;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-078 AC1 and AC8 (journey 19; ADR 0091): a claim link works for 14 days. One tick before then
/// it is read and published; from then on it is refused 410 <c>claim_link_expired</c>, to a visitor
/// and to a member, and its listing stays a draft. The class moves its own clock, so members sign in after it moves.
/// </summary>
public sealed class ExpiredClaimTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private readonly ClaimLinks _claims = new(factory);

    [Fact]
    public async Task Given_a_link_one_tick_short_of_14_days_When_it_is_published_Then_it_works()
    {
        var (listingId, token) = await _claims.IssueAsync();
        factory.Time.Advance(ListingClaim.Lifetime - TimeSpan.FromTicks(1));
        var (client, cookie, _) = await _claims.MemberAsync("grace.expired1@example.org");
        using var _client = client;

        using var read = await ClaimLinks.SendAsync(client, HttpMethod.Get, ClaimLinks.PathOf(token), cookie);
        using var published = await ClaimLinks.SendAsync(client, HttpMethod.Post, ClaimLinks.PathOf(token) + "/publish", cookie);

        Assert.Equal((HttpStatusCode.OK, HttpStatusCode.OK), (read.StatusCode, published.StatusCode));
        Assert.Equal(ListingStatus.Published, (await _claims.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == listingId, TestContext.Current.CancellationToken))).Status);
    }

    [Fact]
    public async Task Given_a_link_14_days_old_When_it_is_read_published_or_declined_Then_it_is_refused_claim_link_expired_and_the_listing_stays_a_draft()
    {
        var (listingId, token) = await _claims.IssueAsync();
        factory.Time.Advance(ListingClaim.Lifetime);
        var (client, cookie, _) = await _claims.MemberAsync("grace.expired2@example.org");
        using var _client = client;
        using var visitor = Browser.CreateClient(factory);

        using var anonymous = await ClaimLinks.SendAsync(visitor, HttpMethod.Get, ClaimLinks.PathOf(token), null);
        using var read = await ClaimLinks.SendAsync(client, HttpMethod.Get, ClaimLinks.PathOf(token), cookie);
        using var publish = await ClaimLinks.SendAsync(client, HttpMethod.Post, ClaimLinks.PathOf(token) + "/publish", cookie);
        using var decline = await ClaimLinks.SendAsync(client, HttpMethod.Post, ClaimLinks.PathOf(token) + "/decline", cookie);

        foreach (var response in new[] { anonymous, read, publish, decline })
        {
            Assert.Equal((HttpStatusCode.Gone, "claim_link_expired"), (response.StatusCode, (await ClaimLinks.JsonAsync(response)).GetProperty("code").GetString()));
        }

        Assert.Equal(ListingStatus.Draft, (await _claims.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == listingId, TestContext.Current.CancellationToken))).Status);
    }
}
