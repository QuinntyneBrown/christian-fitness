using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-023 AC4 (ADR 0026): a draft whose start has passed is not published until its date is changed.
/// The class keeps to itself, because moving the clock past the retreat's start stops every other
/// test from creating it.
/// </summary>
public sealed class PublishPastDraftTests(AdminEventsFactory factory) : IClassFixture<AdminEventsFactory>
{
    [Fact]
    public async Task Given_a_draft_whose_start_has_passed_When_staff_publish_it_Then_it_is_refused_with_start_in_past_and_stays_a_draft()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.publish.past@example.org");
        var id = await AdminEvents.CreatedIdAsync(client, cookie, AdminEvents.Retreat());
        // The retreat starts May 22 at 4:00 PM Toronto; the clock moves to May 23, so staff sign in again (ADR 0016).
        factory.Time.Advance(new DateTimeOffset(2026, 5, 23, 12, 0, 0, TimeSpan.Zero) - factory.Time.GetUtcNow());
        using var signedIn = await Staff.SignInWithCodeAsync(client, "dana.publish.past@example.org", factory.Time.GetUtcNow());
        cookie = Staff.Cookie(signedIn);

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Post, $"/api/admin/events/{id}/publish", cookie);
        using var detail = await AdminEvents.SendAsync(client, HttpMethod.Get, $"/api/admin/events/{id}", cookie);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal("start_in_past", problem.GetProperty("fieldCodes").GetProperty("date").GetString());
        Assert.Equal("draft", (await detail.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("status").GetString());
    }
}
