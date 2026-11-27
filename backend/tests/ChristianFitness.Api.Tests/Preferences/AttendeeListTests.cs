using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Profiles;

namespace ChristianFitness.Api.Tests.Preferences;

/// <summary>
/// L2-065 AC4 (journey 34; ADR 0116): an event names up to five of the members going, in the order
/// they took their places, as the event page's avatar stack draws them. A member who switched "Show
/// me on attendee lists" off is counted in going but never named; staff still see every member in
/// the event's registrations.
/// </summary>
public sealed class AttendeeListTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private static readonly string[] Names =
        ["Michael Chen", "Hidden Member", "Danielle Okafor", "Priya Nair", "Another Hidden", "Aaron Kim", "Jordan Reyes", "Sam Lee"];

    [Fact]
    public async Task Given_members_going_some_off_attendee_lists_When_a_member_opens_the_event_Then_up_to_five_shown_are_named_and_all_are_counted()
    {
        var id = await factory.AddEventAsync("Attendee Run");
        using var client = Browser.CreateClient(factory);
        for (var i = 0; i < Names.Length; i++)
        {
            var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details($"attendee.{i}@example.org") with { FullName = Names[i] });
            if (Names[i].Contains("Hidden", StringComparison.Ordinal))
            {
                var body = Prefs.Body();
                body["privacy"] = new { visibility = "members", showHomeChurch = false, showOnAttendeeLists = false, letAnyoneMessage = false };
                using var saved = await Prefs.SaveAsync(client, cookie, body);
                Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
            }

            using var registered = await Browser.SendAsync(client, HttpMethod.Post, $"/api/events/{id}/registrations", cookie);
            Assert.Equal(HttpStatusCode.OK, registered.StatusCode);
            factory.Time.Advance(TimeSpan.FromMinutes(1));
        }

        var viewer = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("attendee.viewer@example.org"));

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"/api/events/{id}", viewer);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var detail = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(8, detail.GetProperty("going").GetInt32());
        Assert.Equal(
            ["Michael Chen", "Danielle Okafor", "Priya Nair", "Aaron Kim", "Jordan Reyes"],
            detail.GetProperty("attendees").EnumerateArray().Select(a => a.GetString()));
    }

    [Fact]
    public async Task Given_an_event_nobody_is_going_to_When_a_member_registers_Then_the_answer_names_them()
    {
        var id = await factory.AddEventAsync("First Place Run");
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("attendee.first@example.org") with { FullName = "Grace Thompson" });

        using var registered = await Browser.SendAsync(client, HttpMethod.Post, $"/api/events/{id}/registrations", cookie);

        Assert.Equal(HttpStatusCode.OK, registered.StatusCode);
        var detail = await registered.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(1, detail.GetProperty("going").GetInt32());
        Assert.Equal(["Grace Thompson"], detail.GetProperty("attendees").EnumerateArray().Select(a => a.GetString()));
    }
}
