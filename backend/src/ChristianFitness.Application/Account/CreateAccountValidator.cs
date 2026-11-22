using System.Text.RegularExpressions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using FluentValidation;

namespace ChristianFitness.Application.Account;

/// <summary>
/// The Join rules (L2-003 AC3, AC6; ADR 0008). The member app's <c>validateJoin</c> checks the same
/// table before sending, so both suites carry it. A length over its limit fails with
/// <see cref="RefusalCodes.FieldTooLong"/>. The sentences are fixed and never repeat the value.
/// </summary>
public sealed partial class CreateAccountValidator : AbstractValidator<CreateAccountCommand>
{
    public const string NameRequired = "Enter your full name";
    public const string NameTooLong = "Use 100 characters or fewer";
    public const string EmailInvalid = "Enter an email address like name@example.com";
    public const string EmailTooLong = "Use 254 characters or fewer";
    public const string PasswordShort = "Use at least 8 characters";
    public const string HomeChurchTooLong = "Use 120 characters or fewer";
    public const string InterestUnknown = "Choose interests from the list";

    public const int PasswordMinLength = 8;

    public CreateAccountValidator()
    {
        RuleLevelCascadeMode = CascadeMode.Stop;

        RuleFor(c => c.FullName)
            .Must(name => !string.IsNullOrWhiteSpace(name)).WithMessage(NameRequired)
            .Must(name => name.Trim().Length <= Member.NameMaxLength).WithMessage(NameTooLong).WithErrorCode(RefusalCodes.FieldTooLong);

        RuleFor(c => c.Email)
            .Must(email => !string.IsNullOrWhiteSpace(email)).WithMessage(EmailInvalid)
            .Must(email => email.Trim().Length <= Member.EmailMaxLength).WithMessage(EmailTooLong).WithErrorCode(RefusalCodes.FieldTooLong)
            .Must(email => EmailPattern().IsMatch(email.Trim())).WithMessage(EmailInvalid);

        RuleFor(c => c.Password)
            .Must(password => password is { Length: >= PasswordMinLength }).WithMessage(PasswordShort);

        RuleFor(c => c.HomeChurch)
            .Must(church => church is null || church.Trim().Length <= Member.HomeChurchMaxLength)
            .WithMessage(HomeChurchTooLong).WithErrorCode(RefusalCodes.FieldTooLong);

        RuleFor(c => c.Interests)
            .Must(interests => interests is null || interests.All(key => Interests.All.Contains(key, StringComparer.Ordinal)))
            .WithMessage(InterestUnknown);
    }

    /// <summary>One <c>@</c>, something on both sides, a dot in the domain and no white space.</summary>
    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.CultureInvariant)]
    internal static partial Regex EmailPattern();
}
