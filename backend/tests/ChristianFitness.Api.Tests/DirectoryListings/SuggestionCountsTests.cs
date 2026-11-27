using System.Net;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-073 AC1 and L2-020 AC11 (journey 18; ADR 0090): the console's counts answer how many
/// suggestions wait, for the navigation's Listings; the Dashboard's waiting work names the oldest
/// three. Both roles see them; a member does not.
/// </summary>
public sealed class SuggestionCountsTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private readonly ReviewSuggestions _review = new(factory);

    private Task<int> WaitingAsync() =>
        _review.InDbAsync(db => db.ListingSuggestions.CountAsync(s => s.Status == SuggestionStatus.Waiting, TestContext.Current.CancellationToken));

    [Theory]
    [InlineData(StaffRoleName.Admin)]
    [InlineData(StaffRoleName.Moderator)]
    public async Task Given_a_suggestion_arrives_and_is_then_decided_When_staff_ask_for_the_counts_Then_only_waiting_ones_are_counted(StaffRoleName role)
    {
        var (staff, cookie, _) = await _review.StaffAsync($"dana.count.{role}@example.org", role);
        using var _staff = staff;
        var before = await CountsAsync(staff, cookie);

        var arrived = await _review.SuggestAsync($"ada.count.{role}@example.org", "Ada Count");
        var waiting = await CountsAsync(staff, cookie);
        await _review.DecideAsync(arrived.Id, SuggestionStatus.Declined);
        var after = await CountsAsync(staff, cookie);

        Assert.Equal(["suggestions", "storiesInReview", "newFeedback"], waiting.EnumerateObject().Select(p => p.Name));
        Assert.Equal(before.GetProperty("suggestions").GetInt32() + 1, waiting.GetProperty("suggestions").GetInt32());
        Assert.Equal(before.GetProperty("suggestions").GetInt32(), after.GetProperty("suggestions").GetInt32());
        Assert.Equal(await WaitingAsync(), after.GetProperty("suggestions").GetInt32());
    }

    private static async Task<System.Text.Json.JsonElement> CountsAsync(HttpClient staff, string cookie)
    {
        using var response = await AdminEvents.SendAsync(staff, HttpMethod.Get, "/api/admin/counts", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await ReviewSuggestions.JsonAsync(response);
    }

    [Fact]
    public async Task Given_waiting_suggestions_When_a_Moderator_opens_the_Dashboard_Then_it_counts_them_and_names_the_oldest_three()
    {
        for (var i = 0; i < 4; i++)
        {
            await _review.SuggestAsync($"cara.dash{i}@example.org", "Cara Dash", new Dictionary<string, object?>(StringComparer.Ordinal)
            {
                ["relation"] = "someone-i-know",
                ["kind"] = "company",
                ["name"] = $"Dashboard Listing {i}",
                ["where"] = "Leslieville",
                ["website"] = null,
                ["reason"] = "They are good.",
                ["email"] = null,
                ["mayTellWhoSuggested"] = true,
            });
            factory.Time.Advance(TimeSpan.FromMinutes(1));
        }

        var (staff, cookie, _) = await _review.StaffAsync("joel.dash@example.org", StaffRoleName.Moderator);
        using var _staff = staff;
        var oldest = await _review.InDbAsync(db => db.ListingSuggestions.Where(s => s.Status == SuggestionStatus.Waiting)
            .OrderBy(s => s.SubmittedAt).ThenBy(s => s.Id).Take(3).Select(s => new { s.Id, s.Name })
            .ToListAsync(TestContext.Current.CancellationToken));

        using var response = await AdminEvents.SendAsync(staff, HttpMethod.Get, "/api/admin/dashboard/awaiting", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var suggestions = (await ReviewSuggestions.JsonAsync(response)).GetProperty("suggestions");
        Assert.Equal(await WaitingAsync(), suggestions.GetProperty("total").GetInt32());
        var items = suggestions.GetProperty("items").EnumerateArray().ToList();
        Assert.All(items, item => Assert.Equal(["id", "name"], item.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal)));
        Assert.Equal(oldest.Select(s => (s.Id, s.Name)), items.Select(item => (item.GetProperty("id").GetGuid(), item.GetProperty("name").GetString()!)));
    }

    [Fact]
    public async Task Given_a_member_When_they_ask_for_the_counts_Then_they_are_refused()
    {
        var member = await _review.SuggestAsync("eli.count@example.org", "Eli Count");
        using var client = Browser.CreateClient(factory);

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/counts", member.Cookie);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
