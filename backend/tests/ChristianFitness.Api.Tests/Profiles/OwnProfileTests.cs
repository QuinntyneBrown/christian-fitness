using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Application.Profiles;

namespace ChristianFitness.Api.Tests.Profiles;

/// <summary>
/// L2-005 AC1 and AC2: a signed-in member's own profile, with their name, city, join date, bio,
/// home church, goals, interests and the events they are going to, and only their own (ADR 0015).
/// </summary>
public sealed class OwnProfileTests(ProfileApiFactory factory) : IClassFixture<ProfileApiFactory>
{
    private const string Path = "/api/profile/me";

    [Fact]
    public async Task Given_a_member_who_joined_When_they_open_their_profile_Then_it_answers_every_field_with_none_given_yet()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await JoinedAsync(client, JoinTests.Details("grace.profile@example.org"));

        using var response = await Browser.SendAsync(client, HttpMethod.Get, Path, cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(
            ["bio", "city", "goals", "homeChurch", "interests", "joinedAt", "memberId", "name", "showHomeChurch", "upcomingEvents"],
            profile.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("Grace Thompson", profile.GetProperty("name").GetString());
        Assert.Equal("Grace Fellowship, Scarborough", profile.GetProperty("homeChurch").GetString());
        Assert.Equal(["running", "strength"], profile.GetProperty("interests").EnumerateArray().Select(i => i.GetString()));
        Assert.Equal(factory.Time.GetUtcNow(), profile.GetProperty("joinedAt").GetDateTimeOffset());
        Assert.Equal(JsonValueKind.Null, profile.GetProperty("city").ValueKind);
        Assert.Equal(JsonValueKind.Null, profile.GetProperty("bio").ValueKind);
        Assert.Empty(profile.GetProperty("goals").EnumerateArray());
        // L2-005 AC2: nothing registered yet, so the screen shows its empty state.
        Assert.Empty(profile.GetProperty("upcomingEvents").EnumerateArray());
    }

    [Fact]
    public async Task Given_a_member_with_no_home_church_When_they_open_their_profile_Then_the_home_church_is_null()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await JoinedAsync(client, JoinTests.Details("tyler.nochurch@example.org") with { HomeChurch = null, Interests = [] });

        using var response = await Browser.SendAsync(client, HttpMethod.Get, Path, cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(JsonValueKind.Null, profile.GetProperty("homeChurch").ValueKind);
        Assert.Empty(profile.GetProperty("interests").EnumerateArray());
    }

    [Fact]
    public async Task Given_a_member_with_a_city_bio_and_goals_When_they_open_their_profile_Then_it_answers_them()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await JoinedAsync(client, JoinTests.Details("grace.full@example.org"));
        await factory.SetProfileAsync(
            "grace.full@example.org",
            "Toronto, ON",
            "Mom of two, recovering couch-to-5K runner.",
            ["Half marathon in the fall", "Strength twice a week", "Sleep before 11"]);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, Path, cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("Toronto, ON", profile.GetProperty("city").GetString());
        Assert.Equal("Mom of two, recovering couch-to-5K runner.", profile.GetProperty("bio").GetString());
        Assert.Equal(
            ["Half marathon in the fall", "Strength twice a week", "Sleep before 11"],
            profile.GetProperty("goals").EnumerateArray().Select(g => g.GetString()));
    }

    [Fact]
    public async Task Given_a_member_going_to_events_When_they_open_their_profile_Then_it_answers_them_as_the_registrations_give_them()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await JoinedAsync(client, JoinTests.Details("grace.going@example.org"));
        var memberId = await MemberIdAsync(client, cookie);
        var sunrise = new UpcomingEventDto(Guid.Parse("0190c0de-0000-7000-8000-00000000e001"), "Easter Sunrise 5K", new DateTimeOffset(2026, 4, 18, 10, 45, 0, TimeSpan.Zero), "/images/run.jpg");
        var hoops = new UpcomingEventDto(Guid.Parse("0190c0de-0000-7000-8000-00000000e002"), "Women's Hoops & Devotion Night", new DateTimeOffset(2026, 4, 30, 23, 0, 0, TimeSpan.Zero), null);
        factory.Registrations.Set(memberId, [sunrise, hoops]);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, Path, cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var events = (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("upcomingEvents").EnumerateArray().ToList();
        Assert.Equal(2, events.Count);
        Assert.Equal(["cancelled", "eventId", "imageUrl", "startsAt", "title"], events[0].EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(sunrise.EventId, events[0].GetProperty("eventId").GetGuid());
        Assert.Equal("Easter Sunrise 5K", events[0].GetProperty("title").GetString());
        Assert.Equal(sunrise.StartsAt, events[0].GetProperty("startsAt").GetDateTimeOffset());
        Assert.Equal("/images/run.jpg", events[0].GetProperty("imageUrl").GetString());
        Assert.Equal("Women's Hoops & Devotion Night", events[1].GetProperty("title").GetString());
        Assert.Equal(JsonValueKind.Null, events[1].GetProperty("imageUrl").ValueKind);
        // The registrations are asked for this member's events from now on.
        Assert.Contains((memberId, factory.Time.GetUtcNow()), factory.Registrations.Asked);
    }

    // A person sees only their own data (AGENTS.md): the session, never the URL, names the member.
    [Fact]
    public async Task Given_two_members_When_each_opens_their_profile_Then_each_sees_only_their_own()
    {
        using var client = Browser.CreateClient(factory);
        var grace = await JoinedAsync(client, JoinTests.Details("grace.mine@example.org"));
        var michael = await JoinedAsync(client, JoinTests.Details("michael.mine@example.org") with { FullName = "Michael Chen", HomeChurch = "Toronto Chinese Baptist" });
        var michaelId = await MemberIdAsync(client, michael);
        factory.Registrations.Set(michaelId, [new UpcomingEventDto(Guid.CreateVersion7(), "Saturday Long Run", factory.Time.GetUtcNow().AddDays(3), null)]);

        using var graceResponse = await Browser.SendAsync(client, HttpMethod.Get, Path, grace);
        using var michaelResponse = await Browser.SendAsync(client, HttpMethod.Get, Path, michael);

        var graceProfile = await graceResponse.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        var michaelProfile = await michaelResponse.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("Grace Thompson", graceProfile.GetProperty("name").GetString());
        Assert.Equal("Grace Fellowship, Scarborough", graceProfile.GetProperty("homeChurch").GetString());
        Assert.Empty(graceProfile.GetProperty("upcomingEvents").EnumerateArray());
        Assert.Equal("Michael Chen", michaelProfile.GetProperty("name").GetString());
        Assert.Equal("Toronto Chinese Baptist", michaelProfile.GetProperty("homeChurch").GetString());
        Assert.Equal("Saturday Long Run", michaelProfile.GetProperty("upcomingEvents")[0].GetProperty("title").GetString());
    }

    [Fact]
    public async Task Given_a_visitor_When_they_ask_for_a_profile_Then_it_is_refused_with_401()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, Path, cookie: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("unauthenticated", problem.GetProperty("code").GetString());
    }

    /// <summary>Joins with <paramref name="body"/>; answers the session cookie to send back.</summary>
    internal static async Task<string> JoinedAsync(HttpClient client, JoinTests.JoinBody body)
    {
        using var response = await client.PostAsJsonAsync(new Uri("/api/account/join", UriKind.Relative), body, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return Browser.SessionCookie(response);
    }

    internal static async Task<Guid> MemberIdAsync(HttpClient client, string cookie)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", cookie);
        var session = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return session.GetProperty("memberId").GetGuid();
    }
}
