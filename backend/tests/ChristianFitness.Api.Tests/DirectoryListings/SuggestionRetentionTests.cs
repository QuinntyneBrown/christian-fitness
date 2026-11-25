using System.Net;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-073 AC9 (journey 18; ADR 0090): decided suggestions stay listed for 90 days; each decision
/// deletes those decided more than 12 months before, with their checks; the list pages 50 at a time.
/// The clock moves months here, so this class keeps its own store.
/// </summary>
public sealed class SuggestionRetentionTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private const string List = "/api/admin/directory/suggestions";
    private readonly ReviewSuggestions _review = new(factory);

    private static async Task<List<Guid>> AllListedAsync(HttpClient staff, string cookie)
    {
        var ids = new List<Guid>();
        string? after = null;
        do
        {
            using var response = await AdminEvents.SendAsync(staff, HttpMethod.Get, after is null ? List : $"{List}?after={after}", cookie);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var page = await ReviewSuggestions.JsonAsync(response);
            var rows = page.GetProperty("suggestions").EnumerateArray().Select(s => s.GetProperty("id").GetGuid()).ToList();
            Assert.InRange(rows.Count, 0, 50);
            ids.AddRange(rows);
            var next = page.GetProperty("next");
            after = next.ValueKind == System.Text.Json.JsonValueKind.Null ? null : next.GetGuid().ToString();
            Assert.True(after is null || rows.Count == 50);
        }
        while (after is not null);
        return ids;
    }

    [Fact]
    public async Task Given_51_waiting_suggestions_When_staff_page_through_them_Then_they_come_50_at_a_time_oldest_first_each_once()
    {
        var made = new List<Guid>();
        for (var i = 0; i < 51; i++)
        {
            made.Add((await _review.SuggestAsync($"page.{i}@example.org", $"Page {i}")).Id);
        }

        var (staff, cookie, _) = await _review.StaffAsync("dana.paging@example.org");
        using var _staff = staff;

        var listed = await AllListedAsync(staff, cookie);

        Assert.Equal(listed.Count, listed.Distinct().Count());
        Assert.Equal(made, listed.Where(made.Contains));
    }

    [Fact]
    public async Task Given_suggestions_decided_89_and_91_days_ago_When_staff_list_them_Then_only_the_newer_decision_is_listed()
    {
        var older = await _review.SuggestAsync("old.decided@example.org", "Old Decided");
        await _review.DecideAsync(older.Id, SuggestionStatus.Declined);
        factory.Time.Advance(TimeSpan.FromDays(2));
        var newer = await _review.SuggestAsync("new.decided@example.org", "New Decided");
        await _review.DecideAsync(newer.Id, SuggestionStatus.Approved);
        factory.Time.Advance(TimeSpan.FromDays(89));
        var (staff, cookie, _) = await _review.StaffAsync("dana.retention@example.org");
        using var _staff = staff;

        var listed = await AllListedAsync(staff, cookie);

        Assert.DoesNotContain(older.Id, listed);
        Assert.Contains(newer.Id, listed);
    }

    [Fact]
    public async Task Given_suggestions_decided_over_and_under_12_months_ago_When_staff_decide_another_Then_only_the_older_one_and_its_checks_are_deleted()
    {
        var expired = await _review.SuggestAsync("expired.decided@example.org", "Expired Decided");
        await _review.InDbAsync(db =>
        {
            db.SuggestionChecks.Add(SuggestionCheck.Set(expired.Id, ListingCheck.Credentials, true, Guid.CreateVersion7(), factory.Time.GetUtcNow()));
            return db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });
        await _review.DecideAsync(expired.Id, SuggestionStatus.Declined);
        factory.Time.Advance(TimeSpan.FromDays(30));
        var kept = await _review.SuggestAsync("kept.decided@example.org", "Kept Decided");
        await _review.DecideAsync(kept.Id, SuggestionStatus.Declined);
        factory.Time.Advance(TimeSpan.FromDays(340));
        var waiting = await _review.SuggestAsync("waiting.decide@example.org", "Waiting Decide");
        var (staff, cookie, _) = await _review.StaffAsync("dana.purge@example.org", StaffRoleName.Moderator);
        using var _staff = staff;

        using var response = await AdminEvents.SendAsync(staff, HttpMethod.Post, $"{List}/{waiting.Id}/decline", cookie, new { reason = (string?)null });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var left = await _review.InDbAsync(db => db.ListingSuggestions.Where(s => s.Id == expired.Id || s.Id == kept.Id || s.Id == waiting.Id)
            .Select(s => s.Id).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal(new[] { kept.Id, waiting.Id }.Order(), left.Order());
        Assert.Equal(0, await _review.InDbAsync(db => db.SuggestionChecks.CountAsync(c => c.SuggestionId == expired.Id, TestContext.Current.CancellationToken)));
    }
}
