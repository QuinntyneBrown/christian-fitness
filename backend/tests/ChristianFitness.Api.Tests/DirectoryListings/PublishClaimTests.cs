using System.Net;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-078 AC6 and AC11 (journey 19; ADR 0091): a signed-in member publishes the listing behind a
/// valid link. It becomes Published ("Listed") and owned by them, the link is spent, and an audit
/// entry records who and which listing. A self-submitter who claims their own listing owns it. A
/// visitor cannot publish, and a spent link is refused <c>claim_link_used</c>.
/// </summary>
public sealed class PublishClaimTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private readonly ClaimLinks _claims = new(factory);
    private readonly ReviewSuggestions _review = new(factory);

    private static string PublishPath(string token) => ClaimLinks.PathOf(token) + "/publish";

    [Fact]
    public async Task Given_a_valid_link_When_a_member_publishes_Then_the_listing_is_listed_owned_by_them_the_link_is_spent_and_it_is_audited()
    {
        var (listingId, token) = await _claims.IssueAsync();
        var (client, cookie, memberId) = await _claims.MemberAsync("grace.publish1@example.org");
        using var _client = client;
        var now = factory.Time.GetUtcNow();

        using var response = await ClaimLinks.SendAsync(client, HttpMethod.Post, PublishPath(token), cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await ClaimLinks.JsonAsync(response);
        Assert.Equal(["listingId"], answer.EnumerateObject().Select(p => p.Name));
        Assert.Equal(listingId, answer.GetProperty("listingId").GetGuid());
        var listing = await _claims.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == listingId, TestContext.Current.CancellationToken));
        Assert.Equal((ListingStatus.Published, (Guid?)memberId, now), (listing.Status, listing.MemberId, listing.ListedAt));
        var claim = await _claims.InDbAsync(db => db.ListingClaims.SingleAsync(c => c.ListingId == listingId, TestContext.Current.CancellationToken));
        Assert.Equal(now, claim.UsedAt);
        var entry = await _claims.InDbAsync(db => db.AuditEntries.SingleAsync(e => e.RecordId == listingId && e.Action == "listing.claimed", TestContext.Current.CancellationToken));
        Assert.Equal((memberId, "DirectoryListing"), (entry.ActorMemberId, entry.RecordType));
        using var profile = await ClaimLinks.SendAsync(client, HttpMethod.Get, $"/api/directory/{listingId}", null);
        Assert.Equal(HttpStatusCode.OK, profile.StatusCode);
        Assert.True((await ClaimLinks.JsonAsync(profile)).GetProperty("hasOwner").GetBoolean());
    }

    [Fact]
    public async Task Given_a_self_submission_approved_without_an_email_When_its_sender_publishes_from_the_message_Then_the_listing_is_linked_to_their_account()
    {
        var suggested = await _review.SuggestAsync("marcus.publish2@example.org", "Marcus Delaney", new(StringComparer.Ordinal)
        {
            ["relation"] = "myself",
            ["kind"] = "instructor",
            ["name"] = "Coach Marcus Delaney",
            ["where"] = "Mississauga",
            ["website"] = null,
            ["reason"] = "Saturday speed clinics.",
        });
        var (staff, staffCookie, _) = await _review.StaffAsync("dana.publish2@example.org");
        using var _staff = staff;
        foreach (var check in new[] { "credentials", "insurance", "two-references", "conversation" })
        {
            using var ticked = await ReviewSuggestions.SendAsync(staff, HttpMethod.Put, $"/suggestions/{suggested.Id}/checks/{check}", staffCookie, new { passed = true });
        }

        using var approved = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/suggestions/{suggested.Id}/approve", staffCookie);
        var listingId = (await ReviewSuggestions.JsonAsync(approved)).GetProperty("listingId").GetGuid();
        var link = await _claims.InDbAsync(db => db.DirectMessages
            .Where(m => m.SenderId == SystemMembers.ChristianFitnessId && m.RecipientId == suggested.MemberId && m.Text.Contains("/claim/"))
            .Select(m => m.Text).SingleAsync(TestContext.Current.CancellationToken));
        var token = link[(link.IndexOf("/claim/", StringComparison.Ordinal) + "/claim/".Length)..].Split('.', ' ')[0];
        using var client = Browser.CreateClient(factory);

        using var response = await ClaimLinks.SendAsync(client, HttpMethod.Post, PublishPath(token), suggested.Cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var listing = await _claims.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == listingId, TestContext.Current.CancellationToken));
        Assert.Equal((ListingStatus.Published, (Guid?)suggested.MemberId), (listing.Status, listing.MemberId));
    }

    [Fact]
    public async Task Given_a_visitor_When_they_publish_Then_it_is_refused_401_and_nothing_changes()
    {
        var (listingId, token) = await _claims.IssueAsync();
        using var client = Browser.CreateClient(factory);

        using var response = await ClaimLinks.SendAsync(client, HttpMethod.Post, PublishPath(token), null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var listing = await _claims.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == listingId, TestContext.Current.CancellationToken));
        Assert.Equal((ListingStatus.Draft, (Guid?)null), (listing.Status, listing.MemberId));
    }

    [Fact]
    public async Task Given_a_spent_link_When_it_is_published_or_read_again_Then_it_is_refused_claim_link_used_and_the_owner_stays()
    {
        var (listingId, token) = await _claims.IssueAsync();
        var (first, firstCookie, firstId) = await _claims.MemberAsync("grace.publish4@example.org");
        using var _first = first;
        var (second, secondCookie, _) = await _claims.MemberAsync("tyler.publish4@example.org", "Tyler Brooks");
        using var _second = second;
        using var published = await ClaimLinks.SendAsync(first, HttpMethod.Post, PublishPath(token), firstCookie);

        using var again = await ClaimLinks.SendAsync(second, HttpMethod.Post, PublishPath(token), secondCookie);
        using var read = await ClaimLinks.SendAsync(second, HttpMethod.Get, ClaimLinks.PathOf(token), secondCookie);

        Assert.Equal(HttpStatusCode.OK, published.StatusCode);
        Assert.Equal((HttpStatusCode.Conflict, "claim_link_used"), (again.StatusCode, (await ClaimLinks.JsonAsync(again)).GetProperty("code").GetString()));
        Assert.Equal((HttpStatusCode.Conflict, "claim_link_used"), (read.StatusCode, (await ClaimLinks.JsonAsync(read)).GetProperty("code").GetString()));
        var listing = await _claims.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == listingId, TestContext.Current.CancellationToken));
        Assert.Equal((Guid?)firstId, listing.MemberId);
        Assert.Equal(1, await _claims.InDbAsync(db => db.AuditEntries.CountAsync(e => e.RecordId == listingId && e.Action == "listing.claimed", TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task Given_an_unknown_token_When_a_member_publishes_Then_it_is_refused_claim_not_found()
    {
        var (client, cookie, _) = await _claims.MemberAsync("grace.publish5@example.org");
        using var _client = client;

        using var response = await ClaimLinks.SendAsync(client, HttpMethod.Post, PublishPath("no-such-token"), cookie);

        Assert.Equal((HttpStatusCode.NotFound, "claim_not_found"), (response.StatusCode, (await ClaimLinks.JsonAsync(response)).GetProperty("code").GetString()));
    }
}
