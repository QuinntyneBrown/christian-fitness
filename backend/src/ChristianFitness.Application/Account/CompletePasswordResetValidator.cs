using FluentValidation;

namespace ChristianFitness.Application.Account;

/// <summary>
/// A new password follows Join's rule (L2-045 AC5; ADR 0008): at least 8 characters as typed, else
/// 400 <c>validation_failed</c> with Join's sentence. The member app's <c>newPasswordErrorsOf</c>
/// checks the same rule before sending. The token is not validated here: an unusable one, blank
/// included, is the handler's 410 (L2-045 AC4).
/// </summary>
public sealed class CompletePasswordResetValidator : AbstractValidator<CompletePasswordResetCommand>
{
    public CompletePasswordResetValidator()
    {
        RuleFor(c => c.Password)
            .Must(password => password is { Length: >= CreateAccountValidator.PasswordMinLength })
            .WithMessage(CreateAccountValidator.PasswordShort);
    }
}
