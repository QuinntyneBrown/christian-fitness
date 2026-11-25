using System.Net;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-073 AC5, AC6 and AC12, L2-078 AC1 to AC3, L2-062 AC9 (journey 18; ADR 0090): staff approve a
/// suggestion whose four checks passed. It becomes Approved with who and when, a draft listing is
/// made from it and linked both ways, the sender gets a direct message from the Christian Fitness
/// account, and the claim follows: an email with <c>/claim/{token}</c> where there is a contact
/// email, the same link as a direct message for a self-submission without one, or else the listing
/// is published staff-managed. Audited <c>suggestion.approved</c>. Fewer than four checks is 409
/// <c>checks_incomplete</c>; a decided suggestion 409 <c>suggestion_decided</c>.
/// </summary>
public sealed class ApproveSuggestionTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private readonly ReviewSuggestions _review = new(factory);

    private static readonly string[] AllChecks = ["credentials", "insurance", "two-references", "conversation"];

    private static Dictionary<string, object?> Body(string relation, string? email, string name = "Rooted Physio") => new(StringComparer.Ordinal)
    {
        ["relation"] = relation,
        ["kind"] = "company",
        ["name"] = name,
        ["where"] = "Leslieville",
        ["website"] = "rootedphysio.ca",
        ["reason"] = "They gave our run club a free injury clinic.",
        ["email"] = email,
        ["mayTellWhoSuggested"] = true,
    };

    private static async Task PassAsync(HttpClient staff, string cookie, Guid id, int count = 4)
    {
        foreach (var check in AllChecks.Take(count))
        {
            using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Put, $"/suggestions/{id}/checks/{check}", cookie, new { passed = true });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }

    private Task<List<DirectMessage>> SystemMessagesToAsync(Guid memberId) =>
        _review.InDbAsync(db => db.DirectMessages.Where(m => m.SenderId == SystemMembers.ChristianFitnessId && m.RecipientId == memberId)
            .OrderBy(m => m.SentAt).ToListAsync(TestContext.Current.CancellationToken));

    [Fact]
    public async Task Given_four_checks_passed_and_a_contact_email_When_staff_approve_Then_a_draft_listing_is_made_the_claim_link_is_emailed_and_the_sender_is_told()
    {
        var suggested = await _review.SuggestAsync("jordan.approve1@example.org", "Jordan Reid", Body("someone-i-know", "hello@rootedphysio.ca"));
        var (staff, cookie, staffId) = await _review.StaffAsync("dana.approve1@example.org");
        using var _staff = staff;
        await PassAsync(staff, cookie, suggested.Id);
        var now = factory.Time.GetUtcNow();

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/suggestions/{suggested.Id}/approve", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await ReviewSuggestions.JsonAsync(response);
        Assert.Equal(["claim", "listingId", "status"], answer.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(("approved", "email"), (answer.GetProperty("status").GetString(), answer.GetProperty("claim").GetString()));
        var listingId = answer.GetProperty("listingId").GetGuid();
        var suggestion = await _review.InDbAsync(db => db.ListingSuggestions.SingleAsync(s => s.Id == suggested.Id, TestContext.Current.CancellationToken));
        Assert.Equal((SuggestionStatus.Approved, now, staffId, listingId), (suggestion.Status, suggestion.DecidedAt, suggestion.DecidedById, suggestion.ListingId));
        var listing = await _review.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == listingId, TestContext.Current.CancellationToken));
        Assert.Equal(
            (ListingStatus.Draft, ListingKind.Company, "Rooted Physio", "Leslieville", "https://rootedphysio.ca", "", "", (Guid?)suggested.Id, (Guid?)null),
            (listing.Status, listing.Kind, listing.Name, listing.Area, listing.WebsiteUrl, listing.Tagline, listing.Description, listing.SuggestionId, listing.MemberId));
        var claim = await _review.InDbAsync(db => db.ListingClaims.SingleAsync(c => c.ListingId == listingId, TestContext.Current.CancellationToken));
        Assert.Equal(now + TimeSpan.FromDays(14), claim.ExpiresAt);
        var email = Assert.Single(factory.Emails.Sent(), m => m.To == "hello@rootedphysio.ca");
        var token = ClaimToken(email.Text);
        Assert.Equal(ListingClaim.HashOf(token), claim.TokenHash);
        Assert.DoesNotContain(token, claim.TokenHash, StringComparison.Ordinal);
        var told = Assert.Single(await SystemMessagesToAsync(suggested.MemberId));
        Assert.Equal("Thanks for suggesting Rooted Physio. It's now in the directory.", told.Text);
        var entry = await _review.InDbAsync(db => db.AuditEntries.SingleAsync(e => e.RecordId == suggested.Id && e.Action == "suggestion.approved", TestContext.Current.CancellationToken));
        Assert.Equal(staffId, entry.ActorMemberId);
    }

    [Fact]
    public async Task Given_a_self_submission_without_an_email_When_staff_approve_Then_the_claim_link_is_sent_to_the_sender_as_a_direct_message()
    {
        var suggested = await _review.SuggestAsync("marcus.approve2@example.org", "Marcus Delaney", Body("myself", null, "Coach Marcus Delaney"));
        var (staff, cookie, _) = await _review.StaffAsync("dana.approve2@example.org");
        using var _staff = staff;
        await PassAsync(staff, cookie, suggested.Id);

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/suggestions/{suggested.Id}/approve", cookie);

        var answer = await ReviewSuggestions.JsonAsync(response);
        Assert.Equal("message", answer.GetProperty("claim").GetString());
        var listingId = answer.GetProperty("listingId").GetGuid();
        Assert.DoesNotContain(factory.Emails.Sent(), m => m.To == "marcus.approve2@example.org");
        var messages = await SystemMessagesToAsync(suggested.MemberId);
        Assert.Equal(2, messages.Count);
        Assert.Equal("Thanks for suggesting Coach Marcus Delaney. It's now in the directory.", messages[0].Text);
        var token = ClaimToken(messages[1].Text);
        Assert.Equal(
            $"Coach Marcus Delaney was suggested for the Christian Fitness directory. Claim and publish it here: {ApiFactory.MemberAppBaseUrl.TrimEnd('/')}/claim/{token}. The link works for 14 days.",
            messages[1].Text);
        var claim = await _review.InDbAsync(db => db.ListingClaims.SingleAsync(c => c.ListingId == listingId, TestContext.Current.CancellationToken));
        Assert.Equal(ListingClaim.HashOf(token), claim.TokenHash);
        Assert.Equal(ListingStatus.Draft, (await _review.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == listingId, TestContext.Current.CancellationToken))).Status);
    }

    [Fact]
    public async Task Given_no_email_and_not_a_self_submission_When_staff_approve_Then_the_listing_is_published_staff_managed_with_no_claim()
    {
        var suggested = await _review.SuggestAsync("jordan.approve3@example.org", "Jordan Reid", Body("somewhere-ive-been", null, "Eastside Ladies Who Lift"));
        var (staff, cookie, _) = await _review.StaffAsync("dana.approve3@example.org");
        using var _staff = staff;
        await PassAsync(staff, cookie, suggested.Id);
        var now = factory.Time.GetUtcNow();

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/suggestions/{suggested.Id}/approve", cookie);

        var answer = await ReviewSuggestions.JsonAsync(response);
        Assert.Equal("staff-managed", answer.GetProperty("claim").GetString());
        var listingId = answer.GetProperty("listingId").GetGuid();
        var listing = await _review.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == listingId, TestContext.Current.CancellationToken));
        Assert.Equal((ListingStatus.Published, now, (Guid?)null), (listing.Status, listing.ListedAt, listing.MemberId));
        Assert.False(await _review.InDbAsync(db => db.ListingClaims.AnyAsync(c => c.ListingId == listingId, TestContext.Current.CancellationToken)));
        Assert.Single(await SystemMessagesToAsync(suggested.MemberId));
    }

    [Fact]
    public async Task Given_fewer_than_four_checks_passed_When_staff_approve_Then_it_is_refused_checks_incomplete_and_nothing_changes()
    {
        var suggested = await _review.SuggestAsync("jordan.approve4@example.org", "Jordan Reid", Body("someone-i-know", "four@rootedphysio.ca"));
        var (staff, cookie, _) = await _review.StaffAsync("dana.approve4@example.org");
        using var _staff = staff;
        await PassAsync(staff, cookie, suggested.Id, count: 3);

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/suggestions/{suggested.Id}/approve", cookie);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("checks_incomplete", (await ReviewSuggestions.JsonAsync(response)).GetProperty("code").GetString());
        Assert.Equal(SuggestionStatus.Waiting, (await _review.InDbAsync(db => db.ListingSuggestions.SingleAsync(s => s.Id == suggested.Id, TestContext.Current.CancellationToken))).Status);
        Assert.False(await _review.InDbAsync(db => db.DirectoryListings.AnyAsync(l => l.SuggestionId == suggested.Id, TestContext.Current.CancellationToken)));
        Assert.Empty(await SystemMessagesToAsync(suggested.MemberId));
        Assert.DoesNotContain(factory.Emails.Sent(), m => m.To == "four@rootedphysio.ca");
    }

    [Fact]
    public async Task Given_an_approved_suggestion_When_staff_approve_it_again_Then_it_is_refused_suggestion_decided()
    {
        var suggested = await _review.SuggestAsync("jordan.approve5@example.org", "Jordan Reid", Body("somewhere-ive-been", null));
        var (staff, cookie, _) = await _review.StaffAsync("joel.approve5@example.org", StaffRoleName.Moderator);
        using var _staff = staff;
        await PassAsync(staff, cookie, suggested.Id);
        using var first = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/suggestions/{suggested.Id}/approve", cookie);

        using var again = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/suggestions/{suggested.Id}/approve", cookie);
        using var unknown = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/suggestions/{Guid.NewGuid()}/approve", cookie);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        Assert.Equal("suggestion_decided", (await ReviewSuggestions.JsonAsync(again)).GetProperty("code").GetString());
        Assert.Equal("suggestion_not_found", (await ReviewSuggestions.JsonAsync(unknown)).GetProperty("code").GetString());
        Assert.Equal(1, await _review.InDbAsync(db => db.DirectoryListings.CountAsync(l => l.SuggestionId == suggested.Id, TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task Given_a_suspended_sender_When_staff_approve_Then_it_is_approved_and_no_message_is_sent()
    {
        var suggested = await _review.SuggestAsync("jordan.approve6@example.org", "Jordan Reid", Body("somewhere-ive-been", null));
        await _review.SuspendAsync(suggested.MemberId);
        var (staff, cookie, _) = await _review.StaffAsync("dana.approve6@example.org");
        using var _staff = staff;
        await PassAsync(staff, cookie, suggested.Id);

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/suggestions/{suggested.Id}/approve", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(await SystemMessagesToAsync(suggested.MemberId));
    }

    /// <summary>The token of the claim link in <paramref name="text"/>.</summary>
    private static string ClaimToken(string text)
    {
        var at = text.IndexOf("/claim/", StringComparison.Ordinal);
        Assert.True(at >= 0, "The text carries a claim link.");
        var rest = text[(at + "/claim/".Length)..];
        var end = rest.IndexOfAny([' ', '\n', '.']);
        return end < 0 ? rest : rest[..end];
    }
}
