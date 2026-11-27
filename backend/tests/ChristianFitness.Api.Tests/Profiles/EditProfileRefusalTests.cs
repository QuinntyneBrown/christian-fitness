using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;

namespace ChristianFitness.Api.Tests.Profiles;

/// <summary>
/// L2-006 AC3 and L2-032 AC1: a bio over 300 characters, a goal over 80 or more than 5 goals is
/// refused 400 with code <c>field_too_long</c> or <c>too_many_goals</c>, naming the field, and
/// nothing changes (ADR 0024).
/// </summary>
public sealed class EditProfileRefusalTests(ProfileApiFactory factory) : IClassFixture<ProfileApiFactory>
{
    private const string Bio = "Mom of two, recovering couch-to-5K runner.";

    public static TheoryData<string, string, int, int, int, string, string[]> Cases() => new()
    {
        // why, email, bio length, goal count (each of 20 characters, the last of the given length), last goal length, code, fields
        { "bio 301", "grace.bio301@example.org", 301, 1, 20, "field_too_long", ["bio"] },
        { "goal 81", "grace.goal81@example.org", 40, 2, 81, "field_too_long", ["goals"] },
        { "6 goals", "grace.goals6@example.org", 40, 6, 20, "too_many_goals", ["goals"] },
        { "bio 301 and 6 goals: the length wins", "grace.both@example.org", 301, 6, 20, "field_too_long", ["bio", "goals"] },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public async Task Given_a_profile_over_a_limit_When_it_is_saved_Then_it_is_refused_with_the_code_and_nothing_changes(
        string why, string email, int bioLength, int goalCount, int lastGoalLength, string code, string[] fields)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        var memberId = await EditProfileTests.MemberIdAsync(client, cookie);
        await factory.SetProfileAsync(email, "Toronto, ON", Bio, ["Sleep before 11"]);
        var goals = Enumerable.Range(1, goalCount).Select(i => new string((char)('a' + i), i == goalCount ? lastGoalLength : 20)).ToList();

        using var response = await EditProfileTests.PutAsync(client, $"/api/members/{memberId}/profile", cookie, new
        {
            name = "Changed Name",
            city = "Changed City",
            homeChurch = "Changed Church",
            bio = new string('b', bioLength),
            goals,
            interests = new List<string> { "cycling" },
        });

        Assert.True(response.StatusCode == HttpStatusCode.BadRequest, why);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(code, problem.GetProperty("code").GetString());
        Assert.Equal(fields, problem.GetProperty("errors").EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        using var reread = await Browser.SendAsync(client, HttpMethod.Get, "/api/profile/me", cookie);
        var profile = await reread.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("Grace Thompson", profile.GetProperty("name").GetString());
        Assert.Equal("Toronto, ON", profile.GetProperty("city").GetString());
        Assert.Equal("Grace Fellowship, Scarborough", profile.GetProperty("homeChurch").GetString());
        Assert.False(profile.GetProperty("showHomeChurch").GetBoolean());
        Assert.Equal(Bio, profile.GetProperty("bio").GetString());
        Assert.Equal(["Sleep before 11"], profile.GetProperty("goals").EnumerateArray().Select(g => g.GetString()));
        Assert.Equal(["running", "strength"], profile.GetProperty("interests").EnumerateArray().Select(i => i.GetString()));
    }

    [Fact]
    public async Task Given_a_blank_name_When_the_profile_is_saved_Then_it_is_refused_as_validation_failed()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("grace.noname@example.org"));
        var memberId = await EditProfileTests.MemberIdAsync(client, cookie);

        using var response = await EditProfileTests.PutAsync(client, $"/api/members/{memberId}/profile", cookie, new { name = "  " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal(["name"], problem.GetProperty("errors").EnumerateObject().Select(p => p.Name));
        using var reread = await Browser.SendAsync(client, HttpMethod.Get, "/api/profile/me", cookie);
        var profile = await reread.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("Grace Thompson", profile.GetProperty("name").GetString());
    }
}
