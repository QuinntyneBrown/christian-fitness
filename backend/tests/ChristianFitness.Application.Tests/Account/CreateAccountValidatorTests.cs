using ChristianFitness.Application.Account;

namespace ChristianFitness.Application.Tests.Account;

/// <summary>
/// L2-003 AC3 and AC6: the Join rules, one case per row. The member app's <c>validateJoin</c>
/// (frontend/projects/domain/src/account/join-rules.spec.ts) carries the same table (ADR 0008).
/// </summary>
public sealed class CreateAccountValidatorTests
{
    private const string Name = "Grace Thompson";
    private const string Email = "grace.thompson@gmail.com";
    private const string Password = "abundantlife";

    // The email of 254 characters: 64 + "@" + 185 + ".org".
    private static readonly string Email254 = new string('g', 64) + "@" + new string('d', 185) + ".org";

    public static TheoryData<string, string?, string?, string?, string?, string?> Cases() => new()
    {
        // why, fullName, email, password, homeChurch, expected "field:message" or null when valid
        { "valid", Name, Email, Password, "Grace Fellowship, Scarborough", null },
        { "name blank", "", Email, Password, null, "FullName:Enter your full name" },
        { "name white space", "   ", Email, Password, null, "FullName:Enter your full name" },
        { "name 100", new string('n', 100), Email, Password, null, null },
        { "name 101", new string('n', 101), Email, Password, null, "FullName:Use 100 characters or fewer" },
        { "name 100 once trimmed", "  " + new string('n', 100) + " ", Email, Password, null, null },
        { "email blank", Name, "", Password, null, "Email:Enter an email address like name@example.com" },
        { "email without a dot in the domain", Name, "grace.thompson@gmail", Password, null, "Email:Enter an email address like name@example.com" },
        { "email with a space", Name, "grace thompson@gmail.com", Password, null, "Email:Enter an email address like name@example.com" },
        { "email with two @", Name, "grace@@gmail.com", Password, null, "Email:Enter an email address like name@example.com" },
        { "email with nothing before @", Name, "@gmail.com", Password, null, "Email:Enter an email address like name@example.com" },
        { "email with spaces around it", Name, " grace@gmail.com ", Password, null, null },
        { "email 254", Name, Email254, Password, null, null },
        { "email 255", Name, "g" + Email254, Password, null, "Email:Use 254 characters or fewer" },
        { "password 7", Name, Email, "abcdefg", null, "Password:Use at least 8 characters" },
        { "password 8", Name, Email, "abcdefgh", null, null },
        { "password 8 spaces, as typed", Name, Email, "        ", null, null },
        { "home church blank", Name, Email, Password, "", null },
        { "home church 120", Name, Email, Password, new string('c', 120), null },
        { "home church 121", Name, Email, Password, new string('c', 121), "HomeChurch:Use 120 characters or fewer" },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public void Given_a_join_form_When_it_is_validated_Then_only_the_expected_field_fails(
        string why, string? fullName, string? email, string? password, string? homeChurch, string? expected)
    {
        var command = new CreateAccountCommand
        {
            FullName = fullName!,
            Email = email!,
            Password = password!,
            HomeChurch = homeChurch,
        };

        var result = new CreateAccountValidator().Validate(command);

        Assert.True(
            (expected is null ? [] : new[] { expected }).SequenceEqual(result.Errors.Select(e => $"{e.PropertyName}:{e.ErrorMessage}")),
            $"{why}: {string.Join(", ", result.Errors.Select(e => $"{e.PropertyName}:{e.ErrorMessage}"))}");
    }

    [Theory]
    [InlineData(new[] { "running", "retreats" }, true)]
    [InlineData(new[] { "pickleball" }, true)]
    [InlineData(new string[0], true)]
    [InlineData(new[] { "running", "swimming" }, false)]
    [InlineData(new[] { "Running" }, false)]
    public void Given_interests_When_they_are_validated_Then_only_known_keys_pass(string[] interests, bool valid)
    {
        var command = new CreateAccountCommand { FullName = Name, Email = Email, Password = Password, Interests = interests };

        Assert.Equal(valid, new CreateAccountValidator().Validate(command).IsValid);
    }

    [Theory]
    [InlineData("FullName", 101, "field_too_long")]
    [InlineData("Email", 255, "field_too_long")]
    [InlineData("HomeChurch", 121, "field_too_long")]
    public void Given_a_field_over_its_limit_When_it_is_validated_Then_the_failure_is_field_too_long(string field, int length, string code)
    {
        var text = new string('x', length);
        var command = new CreateAccountCommand
        {
            FullName = field == "FullName" ? text : Name,
            Email = field == "Email" ? "g" + Email254[..(length - 2)] + "g" : Email,
            Password = Password,
            HomeChurch = field == "HomeChurch" ? text : null,
        };

        var failure = Assert.Single(new CreateAccountValidator().Validate(command).Errors);

        Assert.Equal(field, failure.PropertyName);
        Assert.Equal(code, failure.ErrorCode);
    }
}
