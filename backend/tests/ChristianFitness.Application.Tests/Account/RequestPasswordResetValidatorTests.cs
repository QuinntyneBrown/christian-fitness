using ChristianFitness.Application.Account;

namespace ChristianFitness.Application.Tests.Account;

/// <summary>
/// L2-044 AC5: the reset request's email rule, one case per row. The member app's
/// <c>emailErrorOf</c> (frontend/projects/domain/src/account/email-rule.spec.ts) carries the same
/// table, as the Join email rows do (ADR 0008).
/// </summary>
public sealed class RequestPasswordResetValidatorTests
{
    private const string Invalid = "Enter an email address like name@example.com";

    // The email of 254 characters: 64 + "@" + 185 + ".org".
    private static readonly string Email254 = new string('g', 64) + "@" + new string('d', 185) + ".org";

    public static TheoryData<string, string?, string?> Cases() => new()
    {
        // why, email, expected message or null when valid
        { "valid", "grace.thompson@gmail.com", null },
        { "blank", "", Invalid },
        { "white space", "   ", Invalid },
        { "missing", null, Invalid },
        { "no dot in the domain", "grace.thompson@gmail", Invalid },
        { "a space", "grace thompson@gmail.com", Invalid },
        { "two @", "grace@@gmail.com", Invalid },
        { "nothing before @", "@gmail.com", Invalid },
        { "no @", "grace.thompson.gmail.com", Invalid },
        { "spaces around it", " grace@gmail.com ", null },
        { "254", Email254, null },
        { "255", "g" + Email254, Invalid },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public void Given_a_reset_request_When_it_is_validated_Then_only_a_malformed_email_fails(string why, string? email, string? expected)
    {
        var result = new RequestPasswordResetValidator().Validate(new RequestPasswordResetCommand { Email = email! });

        Assert.True(
            (expected is null ? [] : new[] { $"Email:{expected}" }).SequenceEqual(result.Errors.Select(e => $"{e.PropertyName}:{e.ErrorMessage}")),
            $"{why}: {string.Join(", ", result.Errors.Select(e => $"{e.PropertyName}:{e.ErrorMessage}"))}");
    }
}
