using System.Net;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-073 AC4 and AC12 (journey 18; ADR 0087): staff tick or untick one of the four checks at
/// <c>PUT api/admin/directory/suggestions/{id}/checks/{check}</c>; it is saved at once with who and
/// when, audited <c>suggestion.check_set</c>, and answered with the four checks. Setting a check to
/// its value saves and audits nothing. An unknown check is 404 <c>not_found</c>, an unknown
/// suggestion 404 <c>suggestion_not_found</c> and a decided one 409 <c>suggestion_decided</c>.
/// </summary>
public sealed class SetSuggestionCheckTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private readonly ReviewSuggestions _review = new(factory);

    private static IEnumerable<(string?, bool)> Checks(JsonElement answer) =>
        answer.GetProperty("checks").EnumerateArray().Select(c => (c.GetProperty("check").GetString(), c.GetProperty("passed").GetBoolean()));

    private Task<int> AuditCountAsync(Guid id) =>
        _review.InDbAsync(db => db.AuditEntries.CountAsync(e => e.RecordId == id && e.Action == "suggestion.check_set", TestContext.Current.CancellationToken));

    [Fact]
    public async Task Given_a_waiting_suggestion_When_staff_tick_a_check_Then_it_is_saved_with_who_and_when_audited_and_kept()
    {
        var suggested = await _review.SuggestAsync("jordan.check1@example.org", "Jordan Reid");
        var (staff, cookie, staffId) = await _review.StaffAsync("dana.check1@example.org");
        using var _staff = staff;
        var now = factory.Time.GetUtcNow();

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Put, $"/suggestions/{suggested.Id}/checks/two-references", cookie, new { passed = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await ReviewSuggestions.JsonAsync(response);
        Assert.Equal(["checks"], answer.EnumerateObject().Select(p => p.Name));
        Assert.Equal([("credentials", false), ("insurance", false), ("two-references", true), ("conversation", false)], Checks(answer));
        var row = await _review.InDbAsync(db => db.SuggestionChecks.SingleAsync(c => c.SuggestionId == suggested.Id, TestContext.Current.CancellationToken));
        Assert.Equal((ListingCheck.TwoReferences, true, staffId, now), (row.Check, row.Passed, row.ChangedById, row.ChangedAt));
        var entry = await _review.InDbAsync(db => db.AuditEntries.SingleAsync(e => e.RecordId == suggested.Id, TestContext.Current.CancellationToken));
        Assert.Equal(("suggestion.check_set", "ListingSuggestion", staffId), (entry.Action, entry.RecordType, entry.ActorMemberId));
        using var again = await ReviewSuggestions.SendAsync(staff, HttpMethod.Get, $"/suggestions/{suggested.Id}", cookie);
        Assert.Equal([("credentials", false), ("insurance", false), ("two-references", true), ("conversation", false)], Checks(await ReviewSuggestions.JsonAsync(again)));
    }

    [Fact]
    public async Task Given_a_passed_check_When_staff_untick_it_Then_it_has_not_passed_and_the_change_is_audited()
    {
        var suggested = await _review.SuggestAsync("jordan.check2@example.org", "Jordan Reid");
        var (staff, cookie, staffId) = await _review.StaffAsync("dana.check2@example.org");
        using var _staff = staff;
        using var ticked = await ReviewSuggestions.SendAsync(staff, HttpMethod.Put, $"/suggestions/{suggested.Id}/checks/insurance", cookie, new { passed = true });
        factory.Time.Advance(TimeSpan.FromMinutes(5));

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Put, $"/suggestions/{suggested.Id}/checks/insurance", cookie, new { passed = false });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.All(Checks(await ReviewSuggestions.JsonAsync(response)), c => Assert.False(c.Item2));
        var row = await _review.InDbAsync(db => db.SuggestionChecks.SingleAsync(c => c.SuggestionId == suggested.Id, TestContext.Current.CancellationToken));
        Assert.Equal((false, factory.Time.GetUtcNow()), (row.Passed, row.ChangedAt));
        Assert.Equal(2, await AuditCountAsync(suggested.Id));
    }

    [Fact]
    public async Task Given_a_check_When_staff_set_it_to_its_value_Then_nothing_is_saved_or_audited()
    {
        var suggested = await _review.SuggestAsync("jordan.check3@example.org", "Jordan Reid");
        var (staff, cookie, _) = await _review.StaffAsync("dana.check3@example.org");
        using var _staff = staff;
        using var ticked = await ReviewSuggestions.SendAsync(staff, HttpMethod.Put, $"/suggestions/{suggested.Id}/checks/credentials", cookie, new { passed = true });
        var at = factory.Time.GetUtcNow();
        factory.Time.Advance(TimeSpan.FromMinutes(5));

        using var same = await ReviewSuggestions.SendAsync(staff, HttpMethod.Put, $"/suggestions/{suggested.Id}/checks/credentials", cookie, new { passed = true });
        using var unset = await ReviewSuggestions.SendAsync(staff, HttpMethod.Put, $"/suggestions/{suggested.Id}/checks/conversation", cookie, new { passed = false });

        Assert.Equal((HttpStatusCode.OK, HttpStatusCode.OK), (same.StatusCode, unset.StatusCode));
        var rows = await _review.InDbAsync(db => db.SuggestionChecks.Where(c => c.SuggestionId == suggested.Id).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal([(ListingCheck.Credentials, at)], rows.Select(r => (r.Check, r.ChangedAt)));
        Assert.Equal(1, await AuditCountAsync(suggested.Id));
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_tick_a_check_Then_it_is_saved()
    {
        var suggested = await _review.SuggestAsync("jordan.check4@example.org", "Jordan Reid");
        var (staff, cookie, _) = await _review.StaffAsync("joel.check4@example.org", StaffRoleName.Moderator);
        using var _staff = staff;

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Put, $"/suggestions/{suggested.Id}/checks/conversation", cookie, new { passed = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, await AuditCountAsync(suggested.Id));
    }

    [Fact]
    public async Task Given_an_unknown_check_or_suggestion_When_staff_set_it_Then_it_is_refused_not_found()
    {
        var suggested = await _review.SuggestAsync("jordan.check5@example.org", "Jordan Reid");
        var (staff, cookie, _) = await _review.StaffAsync("dana.check5@example.org");
        using var _staff = staff;

        using var check = await ReviewSuggestions.SendAsync(staff, HttpMethod.Put, $"/suggestions/{suggested.Id}/checks/references", cookie, new { passed = true });
        using var suggestion = await ReviewSuggestions.SendAsync(staff, HttpMethod.Put, $"/suggestions/{Guid.NewGuid()}/checks/insurance", cookie, new { passed = true });

        Assert.Equal((HttpStatusCode.NotFound, HttpStatusCode.NotFound), (check.StatusCode, suggestion.StatusCode));
        Assert.Equal("not_found", (await ReviewSuggestions.JsonAsync(check)).GetProperty("code").GetString());
        Assert.Equal("suggestion_not_found", (await ReviewSuggestions.JsonAsync(suggestion)).GetProperty("code").GetString());
        Assert.Equal(0, await AuditCountAsync(suggested.Id));
    }

    [Fact]
    public async Task Given_a_decided_suggestion_When_staff_tick_a_check_Then_it_is_refused_and_nothing_changes()
    {
        var suggested = await _review.SuggestAsync("jordan.check6@example.org", "Jordan Reid");
        await _review.DecideAsync(suggested.Id, SuggestionStatus.Declined);
        var (staff, cookie, _) = await _review.StaffAsync("dana.check6@example.org");
        using var _staff = staff;

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Put, $"/suggestions/{suggested.Id}/checks/insurance", cookie, new { passed = true });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("suggestion_decided", (await ReviewSuggestions.JsonAsync(response)).GetProperty("code").GetString());
        Assert.False(await _review.InDbAsync(db => db.SuggestionChecks.AnyAsync(c => c.SuggestionId == suggested.Id, TestContext.Current.CancellationToken)));
        Assert.Equal(0, await AuditCountAsync(suggested.Id));
    }
}
