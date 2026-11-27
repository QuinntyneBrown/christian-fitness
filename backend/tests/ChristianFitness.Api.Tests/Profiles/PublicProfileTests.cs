using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;

namespace ChristianFitness.Api.Tests.Profiles;

/// <summary>
/// L2-005 AC3: another member's profile shows only the public fields, the home church only when
/// its owner chose to show it, and never an email (ADR 0038). Absence is proved by exact keys.
/// </summary>
public sealed class PublicProfileTests(ProfileApiFactory factory) : IClassFixture<ProfileApiFactory>
{
    [Fact]
    public async Task Given_a_member_who_kept_the_home_church_hidden_When_another_member_opens_their_profile_Then_it_answers_exactly_name_bio_and_interests()
    {
        using var client = Browser.CreateClient(factory);
        var viewer = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("viewer.hidden@example.org"));
        var owner = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("michael.hidden@example.org") with { FullName = "Michael Chen" });
        var ownerId = await EditProfileTests.MemberIdAsync(client, owner);
        await factory.SetProfileAsync("michael.hidden@example.org", "Toronto, ON", "Weekend long-runner.", ["Pace the 2:10 group"]);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"/api/members/{ownerId}/profile", viewer);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        // A new member takes messages only from their groups, and these two share none (L2-065 AC5).
        Assert.Equal(["bio", "interests", "messagesRestricted", "name"], profile.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("Michael Chen", profile.GetProperty("name").GetString());
        Assert.Equal("Weekend long-runner.", profile.GetProperty("bio").GetString());
        Assert.Equal(["running", "strength"], profile.GetProperty("interests").EnumerateArray().Select(i => i.GetString()));
    }

    [Fact]
    public async Task Given_a_member_who_chose_to_show_the_home_church_When_another_member_opens_their_profile_Then_it_adds_only_the_home_church()
    {
        using var client = Browser.CreateClient(factory);
        var viewer = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("viewer.shown@example.org"));
        var owner = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("grace.shown@example.org"));
        var ownerId = await EditProfileTests.MemberIdAsync(client, owner);
        using var saved = await EditProfileTests.PutAsync(client, $"/api/members/{ownerId}/profile", owner, new { name = "Grace Thompson", homeChurch = "Grace Fellowship, Scarborough", showHomeChurch = true, goals = Array.Empty<string>(), interests = new List<string> { "running" } });
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"/api/members/{ownerId}/profile", viewer);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["bio", "homeChurch", "interests", "messagesRestricted", "name"], profile.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("Grace Fellowship, Scarborough", profile.GetProperty("homeChurch").GetString());
    }

    [Theory]
    [InlineData("0190c0de-0000-7000-8000-0000000000aa")]
    [InlineData("not-an-id")]
    public async Task Given_an_id_that_names_nobody_When_a_member_asks_for_it_Then_it_is_refused_with_404(string id)
    {
        using var client = Browser.CreateClient(factory);
        var viewer = await OwnProfileTests.JoinedAsync(client, JoinTests.Details($"viewer.{id.Length}@example.org"));

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"/api/members/{id}/profile", viewer);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("not_found", problem.GetProperty("code").GetString());
    }

}
