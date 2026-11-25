using System.Net;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Directory;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-078 AC7 and AC11 (journey 19; ADR 0091): a signed-in member says the listing behind a valid
/// link isn't them. It becomes <c>Declined</c>, nothing is published, the link is spent, an audit
/// entry records who and which listing, and nobody is emailed or messaged. A visitor cannot decline.
/// </summary>
public sealed class DeclineClaimTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private readonly ClaimLinks _claims = new(factory);

    private static string DeclinePath(string token) => ClaimLinks.PathOf(token) + "/decline";

    [Fact]
    public async Task Given_a_valid_link_When_a_member_says_it_isnt_them_Then_the_listing_is_declined_the_link_is_spent_and_no_one_is_contacted()
    {
        var (listingId, token) = await _claims.IssueAsync();
        var (client, cookie, memberId) = await _claims.MemberAsync("grace.decline1@example.org");
        using var _client = client;
        var now = factory.Time.GetUtcNow();
        var emails = factory.Emails.Sent().Count;
        var messages = await _claims.InDbAsync(db => db.DirectMessages.CountAsync(TestContext.Current.CancellationToken));

        using var response = await ClaimLinks.SendAsync(client, HttpMethod.Post, DeclinePath(token), cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(listingId, (await ClaimLinks.JsonAsync(response)).GetProperty("listingId").GetGuid());
        var listing = await _claims.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == listingId, TestContext.Current.CancellationToken));
        Assert.Equal((ListingStatus.Declined, (Guid?)null), (listing.Status, listing.MemberId));
        var claim = await _claims.InDbAsync(db => db.ListingClaims.SingleAsync(c => c.ListingId == listingId, TestContext.Current.CancellationToken));
        Assert.Equal(now, claim.UsedAt);
        var entry = await _claims.InDbAsync(db => db.AuditEntries.SingleAsync(e => e.RecordId == listingId && e.Action == "listing.claim_declined", TestContext.Current.CancellationToken));
        Assert.Equal((memberId, "DirectoryListing"), (entry.ActorMemberId, entry.RecordType));
        Assert.Equal(emails, factory.Emails.Sent().Count);
        Assert.Equal(messages, await _claims.InDbAsync(db => db.DirectMessages.CountAsync(TestContext.Current.CancellationToken)));
        using var profile = await ClaimLinks.SendAsync(client, HttpMethod.Get, $"/api/directory/{listingId}", null);
        Assert.Equal(HttpStatusCode.NotFound, profile.StatusCode);
    }

    [Fact]
    public async Task Given_a_declined_link_When_it_is_published_or_declined_again_Then_it_is_refused_claim_link_used()
    {
        var (listingId, token) = await _claims.IssueAsync();
        var (client, cookie, _) = await _claims.MemberAsync("grace.decline2@example.org");
        using var _client = client;
        using var declined = await ClaimLinks.SendAsync(client, HttpMethod.Post, DeclinePath(token), cookie);

        using var publish = await ClaimLinks.SendAsync(client, HttpMethod.Post, ClaimLinks.PathOf(token) + "/publish", cookie);
        using var again = await ClaimLinks.SendAsync(client, HttpMethod.Post, DeclinePath(token), cookie);

        Assert.Equal(HttpStatusCode.OK, declined.StatusCode);
        Assert.Equal((HttpStatusCode.Conflict, "claim_link_used"), (publish.StatusCode, (await ClaimLinks.JsonAsync(publish)).GetProperty("code").GetString()));
        Assert.Equal((HttpStatusCode.Conflict, "claim_link_used"), (again.StatusCode, (await ClaimLinks.JsonAsync(again)).GetProperty("code").GetString()));
        Assert.Equal(ListingStatus.Declined, (await _claims.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == listingId, TestContext.Current.CancellationToken))).Status);
    }

    [Fact]
    public async Task Given_a_visitor_When_they_decline_Then_it_is_refused_401_and_nothing_changes()
    {
        var (listingId, token) = await _claims.IssueAsync();
        using var client = Browser.CreateClient(factory);

        using var response = await ClaimLinks.SendAsync(client, HttpMethod.Post, DeclinePath(token), null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(ListingStatus.Draft, (await _claims.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == listingId, TestContext.Current.CancellationToken))).Status);
    }
}
