using ChristianFitness.Application.Account;

namespace ChristianFitness.Application.Tests.Account;

/// <summary>
/// L2-045 AC5: the new password's rule, one case per row. The member app's
/// <c>newPasswordErrorsOf</c> (frontend/projects/domain/src/account/new-password-rules.spec.ts)
/// carries the same rows for the password field (ADR 0008).
/// </summary>
public sealed class CompletePasswordResetValidatorTests
{
    private const string Short = "Use at least 8 characters";

    public static TheoryData<string, string?, string?> Cases() => new()
    {
        // why, password, expected message or null when valid
        { "eight characters", "12345678", null },
        { "seven characters", "1234567", Short },
        { "blank", "", Short },
        { "missing", null, Short },
        { "eight spaces, counted as typed", "        ", null },
        { "a long passphrase", "grace and grit and a long run on sunday", null },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public void Given_a_new_password_When_it_is_validated_Then_only_one_shorter_than_8_characters_fails(string why, string? password, string? expected)
    {
        var result = new CompletePasswordResetValidator().Validate(new CompletePasswordResetCommand { Token = "any", Password = password! });

        Assert.True(
            (expected is null ? [] : new[] { $"Password:{expected}" }).SequenceEqual(result.Errors.Select(e => $"{e.PropertyName}:{e.ErrorMessage}")),
            $"{why}: {string.Join(", ", result.Errors.Select(e => $"{e.PropertyName}:{e.ErrorMessage}"))}");
    }
}
