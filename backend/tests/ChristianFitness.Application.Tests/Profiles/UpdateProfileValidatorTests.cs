using ChristianFitness.Application.Profiles;

namespace ChristianFitness.Application.Tests.Profiles;

/// <summary>
/// L2-006 AC3 and AC6: the Edit profile rules, one case per row. The member app's
/// <c>validateProfile</c> (frontend/projects/domain/src/members/profile-rules.spec.ts) carries the
/// same table (ADR 0024).
/// </summary>
public sealed class UpdateProfileValidatorTests
{
    private const string Name = "Grace Thompson";

    public static TheoryData<string, string, string?, string?, string?, string[], string?> Cases() => new()
    {
        // why, name, city, homeChurch, bio, goals, expected "field:message" or null when valid
        { "valid", Name, "Toronto, ON", "Grace Fellowship, Scarborough", "Mom of two.", ["Half marathon in the fall"], null },
        { "nothing optional given", Name, null, null, null, [], null },
        { "name blank", "", null, null, null, [], "Name:Enter your name so people know who you are" },
        { "name white space", "   ", null, null, null, [], "Name:Enter your name so people know who you are" },
        { "name 100", new string('n', 100), null, null, null, [], null },
        { "name 101", new string('n', 101), null, null, null, [], "Name:Use 100 characters or fewer" },
        { "name 100 once trimmed", "  " + new string('n', 100) + " ", null, null, null, [], null },
        { "city 100", Name, new string('c', 100), null, null, [], null },
        { "city 101", Name, new string('c', 101), null, null, [], "City:Use 100 characters or fewer" },
        { "home church 120", Name, null, new string('h', 120), null, [], null },
        { "home church 121", Name, null, new string('h', 121), null, [], "HomeChurch:Use 120 characters or fewer" },
        { "bio 300", Name, null, null, new string('b', 300), [], null },
        { "bio 301", Name, null, null, new string('b', 301), [], "Bio:Keep your bio to 300 characters" },
        { "bio 300 once trimmed", Name, null, null, " " + new string('b', 300) + "  ", [], null },
        { "goal 80", Name, null, null, null, [new string('g', 80)], null },
        { "goal 81", Name, null, null, null, [new string('g', 81)], "Goals:Keep each goal to 80 characters" },
        { "goal 80 once trimmed", Name, null, null, null, ["  " + new string('g', 80) + " "], null },
        { "5 goals", Name, null, null, null, ["a", "b", "c", "d", "e"], null },
        { "6 goals", Name, null, null, null, ["a", "b", "c", "d", "e", "f"], "Goals:Choose up to 5 goals" },
        { "5 goals and blank lines", Name, null, null, null, ["a", "", "b", "  ", "c", "d", "e"], null },
        { "6 goals, one over 80: the length is named", Name, null, null, null, ["a", "b", "c", "d", "e", new string('g', 81)], "Goals:Keep each goal to 80 characters" },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public void Given_a_profile_When_it_is_validated_Then_only_the_expected_field_fails(
        string why, string name, string? city, string? homeChurch, string? bio, string[] goals, string? expected)
    {
        var command = new UpdateProfileCommand { Name = name, City = city, HomeChurch = homeChurch, Bio = bio, Goals = goals };

        var result = new UpdateProfileValidator().Validate(command);

        Assert.True(
            (expected is null ? [] : new[] { expected }).SequenceEqual(result.Errors.Select(e => $"{e.PropertyName}:{e.ErrorMessage}")),
            $"{why}: {string.Join(", ", result.Errors.Select(e => $"{e.PropertyName}:{e.ErrorMessage}"))}");
    }

    [Theory]
    [InlineData("Name", "field_too_long")]
    [InlineData("City", "field_too_long")]
    [InlineData("HomeChurch", "field_too_long")]
    [InlineData("Bio", "field_too_long")]
    [InlineData("Goal", "field_too_long")]
    [InlineData("Goals", "too_many_goals")]
    public void Given_a_profile_over_a_limit_When_it_is_validated_Then_the_failure_carries_the_code(string over, string code)
    {
        var text = new string('x', 301);
        var command = new UpdateProfileCommand
        {
            Name = over == "Name" ? text : Name,
            City = over == "City" ? text : null,
            HomeChurch = over == "HomeChurch" ? text : null,
            Bio = over == "Bio" ? text : null,
            Goals = over switch
            {
                "Goal" => [text],
                "Goals" => ["a", "b", "c", "d", "e", "f"],
                _ => [],
            },
        };

        var failure = Assert.Single(new UpdateProfileValidator().Validate(command).Errors);

        Assert.Equal(code, failure.ErrorCode);
    }

    [Theory]
    [InlineData(new[] { "running", "retreats" }, true)]
    [InlineData(new[] { "pickleball" }, true)]
    [InlineData(new string[0], true)]
    [InlineData(new[] { "running", "swimming" }, false)]
    [InlineData(new[] { "Running" }, false)]
    public void Given_interests_When_they_are_validated_Then_only_known_keys_pass(string[] interests, bool valid)
    {
        var command = new UpdateProfileCommand { Name = Name, Interests = interests };

        Assert.Equal(valid, new UpdateProfileValidator().Validate(command).IsValid);
    }
}
