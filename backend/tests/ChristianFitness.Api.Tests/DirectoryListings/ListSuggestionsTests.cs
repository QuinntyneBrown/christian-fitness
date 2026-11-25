using System.Net;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-073 AC1 to AC3 and AC11 (journey 18; ADR 0090): staff list the suggestions oldest first with the
/// waiting and listed counts, open one with its fields and four unpassed checks, and an unknown one is
/// 404 <c>suggestion_not_found</c>. A Moderator uses it as an Admin does; a member is refused.
/// </summary>
public sealed class ListSuggestionsTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private readonly ReviewSuggestions _review = new(factory);

    private static Dictionary<string, object?> Body(string relation, string kind, string name, string where) => new(StringComparer.Ordinal)
    {
        ["relation"] = relation,
        ["kind"] = kind,
        ["name"] = name,
        ["where"] = where,
        ["website"] = relation == "myself" ? "delaneyperformance.ca" : null,
        ["reason"] = relation == "myself" ? "I run speed and agility for youth athletes." : null,
        ["email"] = null,
        ["mayTellWhoSuggested"] = true,
    };

    [Fact]
    public async Task Given_waiting_suggestions_When_an_Admin_lists_them_Then_they_come_oldest_first_with_who_sent_them_and_the_counts()
    {
        var eastside = await _review.SuggestAsync("adaeze.list1@example.org", "Adaeze Kalu", Body("somewhere-ive-been", "organization", "Eastside Ladies Who Lift", "Danforth & Pape"));
        var marcus = await _review.SuggestAsync("marcus.list1@example.org", "Marcus Delaney", Body("myself", "instructor", "Coach Marcus Delaney", "Mississauga"));
        var rooted = await _review.SuggestAsync("jordan.list1@example.org", "Jordan Reid", Body("someone-i-know", "company", "Rooted Physio", "Leslieville"));
        var (staff, cookie, _) = await _review.StaffAsync("dana.list1@example.org");
        using var _staff = staff;

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Get, "/suggestions", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await ReviewSuggestions.JsonAsync(response);
        Assert.Equal(["listed", "next", "suggestions", "waiting"], answer.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        var waiting = await _review.InDbAsync(db => db.ListingSuggestions.CountAsync(s => s.Status == SuggestionStatus.Waiting, TestContext.Current.CancellationToken));
        var listed = await _review.InDbAsync(db => db.DirectoryListings.CountAsync(l => l.Status == ListingStatus.Published, TestContext.Current.CancellationToken));
        Assert.Equal((waiting, listed), (answer.GetProperty("waiting").GetInt32(), answer.GetProperty("listed").GetInt32()));
        var mine = answer.GetProperty("suggestions").EnumerateArray()
            .Where(s => new[] { eastside.Id, marcus.Id, rooted.Id }.Contains(s.GetProperty("id").GetGuid()))
            .ToList();
        Assert.Equal([eastside.Id, marcus.Id, rooted.Id], mine.Select(s => s.GetProperty("id").GetGuid()));
        var first = mine[0];
        Assert.Equal(["area", "from", "id", "kind", "name", "status", "submittedAt"], first.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(
            ("Eastside Ladies Who Lift", "organization", "Danforth & Pape", "Adaeze Kalu", "waiting"),
            (first.GetProperty("name").GetString(), first.GetProperty("kind").GetString(), first.GetProperty("area").GetString(), first.GetProperty("from").GetString(), first.GetProperty("status").GetString()));
        Assert.Equal(JsonValueKind.Null, mine[1].GetProperty("from").ValueKind);
        Assert.Equal("Jordan Reid", mine[2].GetProperty("from").GetString());
        Assert.True(mine[0].GetProperty("submittedAt").GetDateTimeOffset() < mine[1].GetProperty("submittedAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task Given_a_suggestion_When_staff_open_it_Then_its_fields_and_four_unpassed_checks_come_back()
    {
        var marcus = await _review.SuggestAsync("marcus.list2@example.org", "Marcus Delaney", Body("myself", "instructor", "Coach Marcus Delaney", "Mississauga"));
        var rooted = await _review.SuggestAsync("jordan.list2@example.org", "Jordan Reid", Body("someone-i-know", "company", "Rooted Physio", "Leslieville"));
        var (staff, cookie, _) = await _review.StaffAsync("dana.list2@example.org");
        using var _staff = staff;

        using var self = await ReviewSuggestions.SendAsync(staff, HttpMethod.Get, $"/suggestions/{marcus.Id}", cookie);
        using var other = await ReviewSuggestions.SendAsync(staff, HttpMethod.Get, $"/suggestions/{rooted.Id}", cookie);

        Assert.Equal(HttpStatusCode.OK, self.StatusCode);
        var detail = await ReviewSuggestions.JsonAsync(self);
        Assert.Equal(
            ["area", "checks", "from", "id", "kind", "name", "reason", "relation", "status", "submittedAt", "website"],
            detail.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(
            ("instructor", "Coach Marcus Delaney", "Mississauga", "https://delaneyperformance.ca", "I run speed and agility for youth athletes.", "myself", "waiting"),
            (detail.GetProperty("kind").GetString(), detail.GetProperty("name").GetString(), detail.GetProperty("area").GetString(), detail.GetProperty("website").GetString(),
                detail.GetProperty("reason").GetString(), detail.GetProperty("relation").GetString(), detail.GetProperty("status").GetString()));
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("from").ValueKind);
        Assert.Equal(
            [("credentials", false), ("insurance", false), ("two-references", false), ("conversation", false)],
            detail.GetProperty("checks").EnumerateArray().Select(c => (c.GetProperty("check").GetString(), c.GetProperty("passed").GetBoolean())));
        var knows = await ReviewSuggestions.JsonAsync(other);
        Assert.Equal(("someone-i-know", "Jordan Reid", JsonValueKind.Null, JsonValueKind.Null),
            (knows.GetProperty("relation").GetString(), knows.GetProperty("from").GetString(), knows.GetProperty("website").ValueKind, knows.GetProperty("reason").ValueKind));
    }

    [Fact]
    public async Task Given_an_unknown_id_When_staff_open_it_Then_it_is_refused_not_found()
    {
        var (staff, cookie, _) = await _review.StaffAsync("dana.list3@example.org");
        using var _staff = staff;

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Get, $"/suggestions/{Guid.NewGuid()}", cookie);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("suggestion_not_found", (await ReviewSuggestions.JsonAsync(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_list_and_open_suggestions_Then_they_are_answered_as_an_Admin_is()
    {
        var rooted = await _review.SuggestAsync("jordan.list4@example.org", "Jordan Reid", Body("someone-i-know", "company", "Rooted Physio", "Leslieville"));
        var (staff, cookie, _) = await _review.StaffAsync("joel.list4@example.org", StaffRoleName.Moderator);
        using var _staff = staff;

        using var list = await ReviewSuggestions.SendAsync(staff, HttpMethod.Get, "/suggestions", cookie);
        using var one = await ReviewSuggestions.SendAsync(staff, HttpMethod.Get, $"/suggestions/{rooted.Id}", cookie);

        Assert.Equal((HttpStatusCode.OK, HttpStatusCode.OK), (list.StatusCode, one.StatusCode));
    }

    [Fact]
    public async Task Given_a_member_When_they_ask_for_the_suggestions_Then_they_are_refused()
    {
        var jordan = await _review.SuggestAsync("jordan.list5@example.org", "Jordan Reid", Body("someone-i-know", "company", "Rooted Physio", "Leslieville"));
        using var client = Browser.CreateClient(factory);

        using var response = await ReviewSuggestions.SendAsync(client, HttpMethod.Get, "/suggestions", jordan.Cookie);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
