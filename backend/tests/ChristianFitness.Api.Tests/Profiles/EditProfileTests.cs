using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;

namespace ChristianFitness.Api.Tests.Profiles;

/// <summary>
/// L2-006 AC2, AC4 and AC5: a member saves their own profile at
/// <c>PUT /api/members/{memberId}/profile</c> and reads the saved values back; the home church
/// stays hidden until they show it; any other member's id is refused 403 and nothing changes
/// (ADR 0024).
/// </summary>
public sealed class EditProfileTests(ProfileApiFactory factory) : IClassFixture<ProfileApiFactory>
{
    private const string Me = "/api/profile/me";

    [Fact]
    public async Task Given_a_member_When_they_save_valid_changes_Then_the_answer_and_their_profile_carry_the_saved_values()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("grace.edit@example.org"));
        var memberId = await MemberIdAsync(client, cookie);

        using var response = await PutAsync(client, $"/api/members/{memberId}/profile", cookie, new
        {
            name = "  Grace T. Thompson ",
            city = " Toronto, ON ",
            homeChurch = "Grace Fellowship, Scarborough",
            showHomeChurch = true,
            bio = " Mom of two, recovering couch-to-5K runner. ",
            goals = new List<string> { "Half marathon in the fall", "   ", " Sleep before 11 " },
            interests = new List<string> { "running", "cycling", "pickleball", "running" },
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(
            ["bio", "city", "goals", "homeChurch", "interests", "joinedAt", "memberId", "name", "showHomeChurch", "upcomingEvents"],
            saved.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        using var reread = await Browser.SendAsync(client, HttpMethod.Get, Me, cookie);
        var profile = await reread.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        foreach (var answer in new[] { saved, profile })
        {
            Assert.Equal(memberId, answer.GetProperty("memberId").GetGuid());
            Assert.Equal("Grace T. Thompson", answer.GetProperty("name").GetString());
            Assert.Equal("Toronto, ON", answer.GetProperty("city").GetString());
            Assert.Equal("Grace Fellowship, Scarborough", answer.GetProperty("homeChurch").GetString());
            Assert.True(answer.GetProperty("showHomeChurch").GetBoolean());
            Assert.Equal("Mom of two, recovering couch-to-5K runner.", answer.GetProperty("bio").GetString());
            // A blank line is not a goal; each goal is trimmed.
            Assert.Equal(["Half marathon in the fall", "Sleep before 11"], answer.GetProperty("goals").EnumerateArray().Select(g => g.GetString()));
            Assert.Equal(["running", "cycling", "pickleball"], answer.GetProperty("interests").EnumerateArray().Select(i => i.GetString()));
            Assert.Equal(factory.Time.GetUtcNow(), answer.GetProperty("joinedAt").GetDateTimeOffset());
        }
    }

    [Fact]
    public async Task Given_a_member_When_they_save_a_blank_city_home_church_and_bio_Then_each_is_stored_as_none()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("grace.blank@example.org"));
        var memberId = await MemberIdAsync(client, cookie);
        await factory.SetProfileAsync("grace.blank@example.org", "Toronto, ON", "A bio to clear.", ["A goal to clear"]);

        using var response = await PutAsync(client, $"/api/members/{memberId}/profile", cookie, new
        {
            name = "Grace Thompson",
            city = "  ",
            homeChurch = "",
            showHomeChurch = false,
            bio = " ",
            goals = Array.Empty<string>(),
            interests = Array.Empty<string>(),
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var reread = await Browser.SendAsync(client, HttpMethod.Get, Me, cookie);
        var profile = await reread.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(JsonValueKind.Null, profile.GetProperty("city").ValueKind);
        Assert.Equal(JsonValueKind.Null, profile.GetProperty("homeChurch").ValueKind);
        Assert.Equal(JsonValueKind.Null, profile.GetProperty("bio").ValueKind);
        Assert.Empty(profile.GetProperty("goals").EnumerateArray());
        Assert.Empty(profile.GetProperty("interests").EnumerateArray());
    }

    // L2-006 AC4: the choice defaults to hidden.
    [Fact]
    public async Task Given_a_member_who_just_joined_When_they_open_their_profile_Then_their_home_church_is_hidden()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("grace.hidden@example.org"));

        using var response = await Browser.SendAsync(client, HttpMethod.Get, Me, cookie);

        var profile = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("Grace Fellowship, Scarborough", profile.GetProperty("homeChurch").GetString());
        Assert.False(profile.GetProperty("showHomeChurch").GetBoolean());
    }

    // L2-006 AC5 and L2-031 AC3: another member's id, an id that names nobody and one that is not an
    // id at all get the same 403, and nothing changes.
    [Theory]
    [InlineData("michael")]
    [InlineData("0190c0de-0000-7000-8000-0000000000ff")]
    [InlineData("me")]
    public async Task Given_a_member_When_they_save_a_profile_that_is_not_theirs_Then_it_is_refused_with_403_and_nothing_changes(string target)
    {
        using var client = Browser.CreateClient(factory);
        var grace = await OwnProfileTests.JoinedAsync(client, JoinTests.Details($"grace.other.{target}@example.org"));
        var michael = await OwnProfileTests.JoinedAsync(client, JoinTests.Details($"michael.other.{target}@example.org") with { FullName = "Michael Chen", HomeChurch = "Toronto Chinese Baptist" });
        var michaelId = await MemberIdAsync(client, michael);
        var path = $"/api/members/{(target == "michael" ? michaelId.ToString() : target)}/profile";

        using var response = await PutAsync(client, path, grace, new
        {
            name = "Not Michael",
            city = "Elsewhere",
            homeChurch = "Another church",
            showHomeChurch = true,
            bio = "Changed by someone else.",
            goals = new List<string> { "Changed" },
            interests = new List<string> { "cycling" },
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("forbidden", problem.GetProperty("code").GetString());
        Assert.Equal(403, problem.GetProperty("status").GetInt32());
        using var michaelsOwn = await Browser.SendAsync(client, HttpMethod.Get, Me, michael);
        var michaelProfile = await michaelsOwn.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("Michael Chen", michaelProfile.GetProperty("name").GetString());
        Assert.Equal("Toronto Chinese Baptist", michaelProfile.GetProperty("homeChurch").GetString());
        Assert.False(michaelProfile.GetProperty("showHomeChurch").GetBoolean());
        Assert.Equal(JsonValueKind.Null, michaelProfile.GetProperty("bio").ValueKind);
        using var gracesOwn = await Browser.SendAsync(client, HttpMethod.Get, Me, grace);
        var graceProfile = await gracesOwn.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("Grace Thompson", graceProfile.GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, graceProfile.GetProperty("bio").ValueKind);
    }

    [Fact]
    public async Task Given_a_visitor_When_they_save_a_profile_Then_it_is_refused_with_401()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await PutAsync(client, $"/api/members/{Guid.CreateVersion7()}/profile", cookie: null, new { name = "Grace Thompson" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("unauthenticated", problem.GetProperty("code").GetString());
    }

    /// <summary>Sends <paramref name="body"/> as JSON with <c>PUT</c>, carrying <paramref name="cookie"/>.</summary>
    internal static async Task<HttpResponseMessage> PutAsync(HttpClient client, string path, string? cookie, object body)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, new Uri(path, UriKind.Relative)) { Content = JsonContent.Create(body) };
        if (cookie is not null)
        {
            request.Headers.Add("Cookie", cookie);
        }

        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }

    internal static async Task<Guid> MemberIdAsync(HttpClient client, string cookie)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", cookie);
        var session = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return session.GetProperty("memberId").GetGuid();
    }
}
