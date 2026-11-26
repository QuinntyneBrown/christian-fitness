using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-022 AC7 (ADR 0025): an event whose start has passed may keep its start but not be moved to
/// another time in the past. The class keeps to itself, because moving the clock past the retreat's
/// start stops every other test from creating it.
/// </summary>
public sealed class EditEventPastStartTests(AdminEventsFactory factory) : IClassFixture<AdminEventsFactory>
{
    [Fact]
    public async Task Given_an_event_that_has_begun_When_staff_edit_it_Then_an_unchanged_start_is_kept_and_a_new_start_in_the_past_is_refused()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.past@example.org");
        var id = await AdminEvents.CreatedIdAsync(client, cookie, AdminEvents.Retreat());
        // The retreat starts May 22 at 4:00 PM Toronto; the clock moves to May 23.
        factory.Time.Advance(new DateTimeOffset(2026, 5, 23, 12, 0, 0, TimeSpan.Zero) - factory.Time.GetUtcNow());
        // The staff session idled out meanwhile (ADR 0016), so staff sign in again.
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, client, "dana.past@example.org");
        cookie = Staff.Cookie(signedIn);
        var sameStart = AdminEvents.Retreat();
        sameStart["place"] = "Camp Muskoka";
        var movedBack = AdminEvents.Retreat();
        movedBack["date"] = "2026-05-21";
        var movedAhead = AdminEvents.Retreat();
        movedAhead["date"] = "2026-06-01";

        using var kept = await AdminEvents.SendAsync(client, HttpMethod.Put, $"/api/admin/events/{id}", cookie, sameStart);
        using var refused = await AdminEvents.SendAsync(client, HttpMethod.Put, $"/api/admin/events/{id}", cookie, movedBack);
        using var moved = await AdminEvents.SendAsync(client, HttpMethod.Put, $"/api/admin/events/{id}", cookie, movedAhead);

        Assert.Equal(HttpStatusCode.OK, kept.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, refused.StatusCode);
        var problem = await refused.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("start_in_past", problem.GetProperty("fieldCodes").GetProperty("date").GetString());
        Assert.Equal(HttpStatusCode.OK, moved.StatusCode);
    }
}
