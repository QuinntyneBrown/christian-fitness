using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;

namespace ChristianFitness.Api.Tests.Preferences;

/// <summary>
/// L2-065 AC1, AC5, AC6, AC8 and AC10 (journey 34, slice 1): a new member's profile is seen by
/// Members, their home church is not shown, they are on attendee lists and only their groups may
/// message them; the area is none of the eight until chosen and the interests are the profile's.
/// Save keeps them with the rest of the page; an unknown visibility, area or interest is refused
/// naming the field, and nothing is saved.
/// </summary>
public sealed class PrivacyPreferencesTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    [Fact]
    public async Task Given_a_new_member_When_they_open_preferences_Then_privacy_and_suggestions_show_their_defaults()
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, _) = await Prefs.JoinAsync(factory, client, "grace.privacy.new@example.org");

        var preferences = await Prefs.GetAsync(client, cookie);

        Assert.Equal(["name", "email", "notifications", "privacy", "suggestions"], preferences.EnumerateObject().Select(p => p.Name));
        Assert.Equal(
            """{"visibility":"members","showHomeChurch":false,"showOnAttendeeLists":true,"letAnyoneMessage":false}""",
            preferences.GetProperty("privacy").GetRawText());
        var suggestions = preferences.GetProperty("suggestions");
        Assert.Equal(["area", "interests"], suggestions.EnumerateObject().Select(p => p.Name));
        Assert.Equal(JsonValueKind.Null, suggestions.GetProperty("area").ValueKind);
        // The interests are the profile's own (AC7): the test member joins with these.
        Assert.Equal(await ProfileInterestsAsync(client, cookie), suggestions.GetProperty("interests").EnumerateArray().Select(i => i.GetString()!));
    }

    [Fact]
    public async Task Given_privacy_and_suggestions_changed_When_they_are_saved_Then_they_are_kept_and_the_profile_takes_the_interests()
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, _) = await Prefs.JoinAsync(factory, client, "grace.privacy.save@example.org");
        var body = Prefs.Body(weekly: true);
        body["privacy"] = new { visibility = "groups", showHomeChurch = true, showOnAttendeeLists = false, letAnyoneMessage = true };
        body["suggestions"] = new { area = "scarborough", interests = new[] { "cycling", "running", "cycling" } };

        using var response = await Prefs.SaveAsync(client, cookie, body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var read = await Prefs.GetAsync(client, cookie);
        Assert.Equal(
            """{"visibility":"groups","showHomeChurch":true,"showOnAttendeeLists":false,"letAnyoneMessage":true}""",
            read.GetProperty("privacy").GetRawText());
        Assert.Equal("""{"area":"scarborough","interests":["cycling","running"]}""", read.GetProperty("suggestions").GetRawText());
        Assert.True(read.GetProperty("email").GetProperty("weekly").GetBoolean());
        Assert.Equal(["cycling", "running"], await ProfileInterestsAsync(client, cookie));
        using var profile = await Browser.SendAsync(client, HttpMethod.Get, "/api/profile/me", cookie);
        Assert.True((await profile.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("showHomeChurch").GetBoolean());

        // No area again: "none" is a choice.
        body["suggestions"] = new { area = (string?)null, interests = Array.Empty<string>() };
        using var cleared = await Prefs.SaveAsync(client, cookie, body);
        Assert.Equal(HttpStatusCode.OK, cleared.StatusCode);
        Assert.Equal("""{"area":null,"interests":[]}""", (await Prefs.GetAsync(client, cookie)).GetProperty("suggestions").GetRawText());
    }

    // L2-006 AC4, L2-065 AC10: "Show my home church" is Preferences' alone. Saving Edit profile,
    // even with a showHomeChurch an older page still sends, keeps the choice Preferences made.
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Given_the_home_church_choice_made_in_preferences_When_Edit_profile_saves_Then_the_choice_is_kept(bool shown)
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, id) = await Prefs.JoinAsync(factory, client, $"grace.privacy.church.{shown}@example.org");
        var body = Prefs.Body();
        body["privacy"] = new { visibility = "members", showHomeChurch = shown, showOnAttendeeLists = true, letAnyoneMessage = false };
        using var saved = await Prefs.SaveAsync(client, cookie, body);
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);

        using var edited = await Profiles.EditProfileTests.PutAsync(client, $"/api/members/{id}/profile", cookie, new
        {
            name = "Grace Thompson",
            homeChurch = "Grace Fellowship, Scarborough",
            showHomeChurch = !shown,
            goals = Array.Empty<string>(),
            interests = new List<string> { "running" },
        });

        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        var answer = await edited.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(shown, answer.GetProperty("showHomeChurch").GetBoolean());
        Assert.Equal(shown, (await Prefs.GetAsync(client, cookie)).GetProperty("privacy").GetProperty("showHomeChurch").GetBoolean());
    }

    [Theory]
    [InlineData("visibility", "everyone", "scarborough", "running", "privacy.visibility", "visibility_invalid")]
    [InlineData("area", "members", "the-moon", "running", "suggestions.area", "area_invalid")]
    [InlineData("interest", "members", "scarborough", "knitting", "suggestions.interests", "interest_invalid")]
    public async Task Given_a_value_not_on_the_list_When_preferences_are_saved_Then_it_is_refused_naming_the_field_and_nothing_is_saved(
        string what, string visibility, string area, string interest, string field, string code)
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, _) = await Prefs.JoinAsync(factory, client, $"grace.privacy.{what}@example.org");
        var body = Prefs.Body(messages: false);
        body["privacy"] = new { visibility, showHomeChurch = false, showOnAttendeeLists = true, letAnyoneMessage = true };
        body["suggestions"] = new { area, interests = new[] { interest } };

        using var response = await Prefs.SaveAsync(client, cookie, body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal(code, problem.GetProperty("fieldCodes").GetProperty(field).GetString());
        // Saved together or not at all (L2-064 AC6): the notification switch sent with it is unchanged.
        var read = await Prefs.GetAsync(client, cookie);
        Assert.True(read.GetProperty("notifications").GetProperty("messages").GetBoolean());
        Assert.False(read.GetProperty("privacy").GetProperty("letAnyoneMessage").GetBoolean());
    }

    private static async Task<string[]> ProfileInterestsAsync(HttpClient client, string cookie)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/profile/me", cookie);
        var profile = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return [.. profile.GetProperty("interests").EnumerateArray().Select(i => i.GetString()!)];
    }
}
