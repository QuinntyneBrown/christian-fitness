using System.Net;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Directory;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-078 AC8 and AC9 (journey 19; ADR 0091): on an approved suggestion whose listing is still a
/// draft, an Admin or a Moderator sends a new claim link. Every open link of the listing stops
/// working, a new one goes out by the channel approval used, and the resend is audited
/// <c>listing.claim_link_resent</c>. The panel's <c>claim</c> tells staff where the link stands:
/// <c>sent</c>, <c>expired</c>, <c>claimed</c>, <c>declined</c> or <c>staff-managed</c>, none
/// before approval. A closed claim is 409 <c>claim_closed</c>. The class moves its own clock.
/// </summary>
public sealed class ResendClaimLinkTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private readonly ApprovedSuggestions _approved = new(factory);
    private readonly ClaimLinks _claims = new(factory);

    private static string ResendPath(Guid id) => $"/suggestions/{id}/claim-link";

    [Fact]
    public async Task Given_a_link_sent_by_email_When_staff_send_a_new_one_Then_it_is_emailed_the_old_one_stops_working_and_it_is_audited()
    {
        using var approved = await _approved.ApproveAsync("jordan.resend1@example.org", ApprovedSuggestions.Body("someone-i-know", "hello@rootedphysio.ca"));
        var emails = factory.Emails.Sent().Count;
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        var now = factory.Time.GetUtcNow();

        using var response = await ReviewSuggestions.SendAsync(approved.Staff, HttpMethod.Post, ResendPath(approved.Suggested.Id), approved.Cookie);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var email = Assert.Single(factory.Emails.Sent().Skip(emails));
        Assert.Equal(("hello@rootedphysio.ca", "Claim your listing on Christian Fitness"), (email.To, email.Subject));
        var token = await _approved.LatestTokenAsync(approved.Suggested.MemberId, emails);
        Assert.NotNull(token);
        Assert.NotEqual(approved.Token, token);
        using var visitor = Browser.CreateClient(factory);
        using var old = await ClaimLinks.SendAsync(visitor, HttpMethod.Get, ClaimLinks.PathOf(approved.Token!), null);
        using var fresh = await ClaimLinks.SendAsync(visitor, HttpMethod.Get, ClaimLinks.PathOf(token), null);
        Assert.Equal((HttpStatusCode.Gone, "claim_link_expired"), (old.StatusCode, (await ClaimLinks.JsonAsync(old)).GetProperty("code").GetString()));
        Assert.Equal(HttpStatusCode.OK, fresh.StatusCode);
        var claims = await _claims.InDbAsync(db => db.ListingClaims.Where(c => c.ListingId == approved.ListingId).OrderBy(c => c.IssuedAt).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal(2, claims.Count);
        Assert.Equal((now, (DateTimeOffset?)null), (claims[0].VoidedAt, claims[1].VoidedAt));
        Assert.Equal(now + ListingClaim.Lifetime, claims[1].ExpiresAt);
        var entry = await _claims.InDbAsync(db => db.AuditEntries.SingleAsync(e => e.RecordId == approved.ListingId && e.Action == "listing.claim_link_resent", TestContext.Current.CancellationToken));
        Assert.Equal("DirectoryListing", entry.RecordType);
        Assert.Equal("sent", await ApprovedSuggestions.ClaimOfAsync(approved.Staff, approved.Cookie, approved.Suggested.Id));
    }

    [Fact]
    public async Task Given_a_link_sent_to_a_self_submitter_by_message_When_staff_send_a_new_one_Then_it_is_messaged_and_nothing_is_emailed()
    {
        using var approved = await _approved.ApproveAsync("marcus.resend2@example.org", ApprovedSuggestions.Body("myself", null));
        var emails = factory.Emails.Sent().Count;
        factory.Time.Advance(TimeSpan.FromMinutes(5));

        using var response = await ReviewSuggestions.SendAsync(approved.Staff, HttpMethod.Post, ResendPath(approved.Suggested.Id), approved.Cookie);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(emails, factory.Emails.Sent().Count);
        var token = await _approved.LatestTokenAsync(approved.Suggested.MemberId, emails);
        Assert.NotNull(token);
        Assert.NotEqual(approved.Token, token);
        using var client = Browser.CreateClient(factory);
        using var published = await ClaimLinks.SendAsync(client, HttpMethod.Post, ClaimLinks.PathOf(token) + "/publish", approved.Suggested.Cookie);
        Assert.Equal(HttpStatusCode.OK, published.StatusCode);
    }

    [Fact]
    public async Task Given_a_link_not_used_in_14_days_When_staff_read_the_panel_Then_it_is_expired_and_a_new_link_makes_it_sent()
    {
        using var approved = await _approved.ApproveAsync("jordan.resend3@example.org", ApprovedSuggestions.Body("someone-i-know", "three@rootedphysio.ca"));
        Assert.Equal("sent", await ApprovedSuggestions.ClaimOfAsync(approved.Staff, approved.Cookie, approved.Suggested.Id));
        factory.Time.Advance(ListingClaim.Lifetime);
        var (staff, cookie, _) = await new ReviewSuggestions(factory).StaffAsync("dana.resend3@example.org");
        using var _staff = staff;

        var expired = await ApprovedSuggestions.ClaimOfAsync(staff, cookie, approved.Suggested.Id);
        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, ResendPath(approved.Suggested.Id), cookie);

        Assert.Equal("expired", expired);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("sent", await ApprovedSuggestions.ClaimOfAsync(staff, cookie, approved.Suggested.Id));
    }

    [Fact]
    public async Task Given_the_listed_party_answered_When_staff_read_the_panel_or_send_a_new_link_Then_it_reads_claimed_or_declined_and_is_refused_claim_closed()
    {
        using var claimed = await _approved.ApproveAsync("jordan.resend4@example.org", ApprovedSuggestions.Body("someone-i-know", "four@rootedphysio.ca"));
        using var declined = await _approved.ApproveAsync("jordan.resend5@example.org", ApprovedSuggestions.Body("someone-i-know", "five@rootedphysio.ca"));
        var (member, memberCookie, _) = await _claims.MemberAsync("owner.resend4@example.org");
        using var _member = member;
        using var publish = await ClaimLinks.SendAsync(member, HttpMethod.Post, ClaimLinks.PathOf(claimed.Token!) + "/publish", memberCookie);
        using var decline = await ClaimLinks.SendAsync(member, HttpMethod.Post, ClaimLinks.PathOf(declined.Token!) + "/decline", memberCookie);
        Assert.Equal((HttpStatusCode.OK, HttpStatusCode.OK), (publish.StatusCode, decline.StatusCode));

        Assert.Equal("claimed", await ApprovedSuggestions.ClaimOfAsync(claimed.Staff, claimed.Cookie, claimed.Suggested.Id));
        Assert.Equal("declined", await ApprovedSuggestions.ClaimOfAsync(declined.Staff, declined.Cookie, declined.Suggested.Id));
        foreach (var answered in new[] { claimed, declined })
        {
            using var response = await ReviewSuggestions.SendAsync(answered.Staff, HttpMethod.Post, ResendPath(answered.Suggested.Id), answered.Cookie);
            Assert.Equal((HttpStatusCode.Conflict, "claim_closed"), (response.StatusCode, (await ReviewSuggestions.JsonAsync(response)).GetProperty("code").GetString()));
        }
    }

    [Fact]
    public async Task Given_a_waiting_or_staff_managed_suggestion_When_staff_send_a_link_Then_it_is_refused_claim_closed_and_nothing_is_sent()
    {
        var (staff, cookie, waiting) = await _approved.WaitingAsync("jordan.resend6@example.org", ApprovedSuggestions.Body("someone-i-know", "six@rootedphysio.ca"));
        using var _staff = staff;
        using var managed = await _approved.ApproveAsync("jordan.resend7@example.org", ApprovedSuggestions.Body("somewhere-ive-been", null));
        var emails = factory.Emails.Sent().Count;

        Assert.Null(await ApprovedSuggestions.ClaimOfAsync(staff, cookie, waiting.Id));
        Assert.Equal("staff-managed", await ApprovedSuggestions.ClaimOfAsync(managed.Staff, managed.Cookie, managed.Suggested.Id));
        using var forWaiting = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, ResendPath(waiting.Id), cookie);
        using var forManaged = await ReviewSuggestions.SendAsync(managed.Staff, HttpMethod.Post, ResendPath(managed.Suggested.Id), managed.Cookie);

        foreach (var response in new[] { forWaiting, forManaged })
        {
            Assert.Equal((HttpStatusCode.Conflict, "claim_closed"), (response.StatusCode, (await ReviewSuggestions.JsonAsync(response)).GetProperty("code").GetString()));
        }

        Assert.Equal(emails, factory.Emails.Sent().Count);
        Assert.False(await _claims.InDbAsync(db => db.AuditEntries.AnyAsync(e => e.Action == "listing.claim_link_resent" && e.RecordId == managed.ListingId, TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task Given_an_unknown_suggestion_When_staff_send_a_link_Then_it_is_refused_suggestion_not_found()
    {
        var (staff, cookie, _) = await new ReviewSuggestions(factory).StaffAsync("dana.resend8@example.org");
        using var _staff = staff;

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, ResendPath(Guid.CreateVersion7()), cookie);

        Assert.Equal((HttpStatusCode.NotFound, "suggestion_not_found"), (response.StatusCode, (await ReviewSuggestions.JsonAsync(response)).GetProperty("code").GetString()));
    }
}
