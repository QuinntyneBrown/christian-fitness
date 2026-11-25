using System.Net;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-073 AC8 and AC12, L2-062 AC9 (journey 18; ADR 0087): staff decline a suggestion, with or
/// without a reason of at most 500 characters kept for staff. It becomes Declined with who and
/// when, the sender gets a direct message from the Christian Fitness account, the suggested party
/// is not contacted and no listing is made. Audited <c>suggestion.declined</c>.
/// </summary>
public sealed class DeclineSuggestionTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private readonly ReviewSuggestions _review = new(factory);

    private static Dictionary<string, object?> Body(string email) => new(StringComparer.Ordinal)
    {
        ["relation"] = "someone-i-know",
        ["kind"] = "company",
        ["name"] = "Rooted Physio",
        ["where"] = "Leslieville",
        ["website"] = null,
        ["reason"] = "They gave our run club a free injury clinic.",
        ["email"] = email,
        ["mayTellWhoSuggested"] = true,
    };

    private Task<List<DirectMessage>> SystemMessagesToAsync(Guid memberId) =>
        _review.InDbAsync(db => db.DirectMessages.Where(m => m.SenderId == SystemMembers.ChristianFitnessId && m.RecipientId == memberId)
            .ToListAsync(TestContext.Current.CancellationToken));

    [Fact]
    public async Task Given_a_waiting_suggestion_When_staff_decline_it_with_a_reason_Then_it_is_declined_the_sender_is_told_and_the_suggested_party_is_not()
    {
        var suggested = await _review.SuggestAsync("jordan.decline1@example.org", "Jordan Reid", Body("hello@declined1.example.org"));
        var (staff, cookie, staffId) = await _review.StaffAsync("dana.decline1@example.org");
        using var _staff = staff;
        var now = factory.Time.GetUtcNow();
        var listingsBefore = await _review.InDbAsync(db => db.DirectoryListings.CountAsync(TestContext.Current.CancellationToken));

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/suggestions/{suggested.Id}/decline", cookie, new { reason = "  Not in the GTA.  " });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await ReviewSuggestions.JsonAsync(response);
        Assert.Equal("declined", answer.GetProperty("status").GetString());
        var suggestion = await _review.InDbAsync(db => db.ListingSuggestions.SingleAsync(s => s.Id == suggested.Id, TestContext.Current.CancellationToken));
        Assert.Equal((SuggestionStatus.Declined, now, staffId, "Not in the GTA.", (Guid?)null),
            (suggestion.Status, suggestion.DecidedAt, suggestion.DecidedById, suggestion.DeclineReason, suggestion.ListingId));
        var told = Assert.Single(await SystemMessagesToAsync(suggested.MemberId));
        Assert.Equal("Thanks for suggesting Rooted Physio. We won't be adding it this time.", told.Text);
        Assert.DoesNotContain(factory.Emails.Sent(), m => m.To == "hello@declined1.example.org");
        Assert.Equal(listingsBefore, await _review.InDbAsync(db => db.DirectoryListings.CountAsync(TestContext.Current.CancellationToken)));
        var entry = await _review.InDbAsync(db => db.AuditEntries.SingleAsync(e => e.RecordId == suggested.Id && e.Action == "suggestion.declined", TestContext.Current.CancellationToken));
        Assert.Equal(staffId, entry.ActorMemberId);
    }

    [Fact]
    public async Task Given_no_reason_When_staff_decline_Then_it_is_declined_with_none_kept()
    {
        var suggested = await _review.SuggestAsync("jordan.decline2@example.org", "Jordan Reid", Body("hello@declined2.example.org"));
        var (staff, cookie, _) = await _review.StaffAsync("dana.decline2@example.org", StaffRoleName.Moderator);
        using var _staff = staff;

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/suggestions/{suggested.Id}/decline", cookie, new { reason = "   " });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var suggestion = await _review.InDbAsync(db => db.ListingSuggestions.SingleAsync(s => s.Id == suggested.Id, TestContext.Current.CancellationToken));
        Assert.Equal((SuggestionStatus.Declined, (string?)null), (suggestion.Status, suggestion.DeclineReason));
    }

    [Fact]
    public async Task Given_a_reason_over_500_characters_When_staff_decline_Then_it_is_refused_reason_too_long_and_nothing_changes()
    {
        var suggested = await _review.SuggestAsync("jordan.decline3@example.org", "Jordan Reid", Body("hello@declined3.example.org"));
        var (staff, cookie, _) = await _review.StaffAsync("dana.decline3@example.org");
        using var _staff = staff;

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/suggestions/{suggested.Id}/decline", cookie, new { reason = new string('a', 501) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await ReviewSuggestions.JsonAsync(response);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal("reason_too_long", problem.GetProperty("fieldCodes").GetProperty("reason").GetString());
        var suggestion = await _review.InDbAsync(db => db.ListingSuggestions.SingleAsync(s => s.Id == suggested.Id, TestContext.Current.CancellationToken));
        Assert.Equal(SuggestionStatus.Waiting, suggestion.Status);
        Assert.Empty(await SystemMessagesToAsync(suggested.MemberId));
    }

    [Fact]
    public async Task Given_a_reason_of_exactly_500_characters_When_staff_decline_Then_it_is_kept()
    {
        var suggested = await _review.SuggestAsync("jordan.decline4@example.org", "Jordan Reid", Body("hello@declined4.example.org"));
        var (staff, cookie, _) = await _review.StaffAsync("dana.decline4@example.org");
        using var _staff = staff;

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/suggestions/{suggested.Id}/decline", cookie, new { reason = new string('a', 500) });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var suggestion = await _review.InDbAsync(db => db.ListingSuggestions.SingleAsync(s => s.Id == suggested.Id, TestContext.Current.CancellationToken));
        Assert.Equal(500, suggestion.DeclineReason?.Length);
    }

    [Fact]
    public async Task Given_a_decided_or_unknown_suggestion_When_staff_decline_Then_it_is_refused()
    {
        var suggested = await _review.SuggestAsync("jordan.decline5@example.org", "Jordan Reid", Body("hello@declined5.example.org"));
        await _review.DecideAsync(suggested.Id, SuggestionStatus.Approved);
        var (staff, cookie, _) = await _review.StaffAsync("dana.decline5@example.org");
        using var _staff = staff;

        using var decided = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/suggestions/{suggested.Id}/decline", cookie, new { reason = (string?)null });
        using var unknown = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/suggestions/{Guid.NewGuid()}/decline", cookie, new { reason = (string?)null });

        Assert.Equal(HttpStatusCode.Conflict, decided.StatusCode);
        Assert.Equal("suggestion_decided", (await ReviewSuggestions.JsonAsync(decided)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        Assert.Equal("suggestion_not_found", (await ReviewSuggestions.JsonAsync(unknown)).GetProperty("code").GetString());
        Assert.Empty(await SystemMessagesToAsync(suggested.MemberId));
    }
}
