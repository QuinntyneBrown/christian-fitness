using System.Linq.Expressions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Services;
using FluentValidation;

namespace ChristianFitness.Application.Services;

/// <summary>
/// The Apply to be listed rules (L2-026; ADR 0000). Every field is required; lengths count the
/// trimmed text and fail with <see cref="RefusalCodes.FieldTooLong"/>; a category outside the list
/// fails as a plain validation failure. The sentences are fixed and never repeat the value. The
/// member app's <c>validateApplication</c> checks the same table.
/// </summary>
public sealed class SubmitApplicationValidator : AbstractValidator<SubmitApplicationCommand>
{
    public const string RoleRequired = "Enter your role, such as Personal trainer";
    public const string RoleTooLong = "Use 80 characters or fewer";
    public const string CategoryUnknown = "Choose a category from the list";
    public const string CredentialsRequired = "Tell members about your credentials";
    public const string CredentialsTooLong = "Use 200 characters or fewer";
    public const string WhereRequired = "Enter where you work, such as Mississauga";
    public const string WhereTooLong = "Use 80 characters or fewer";
    public const string PriceRequired = "Enter your price, such as $70 / session";
    public const string PriceTooLong = "Use 60 characters or fewer";
    public const string AboutRequired = "Tell members a little about you";
    public const string AboutTooLong = "Keep it to 300 characters";

    public SubmitApplicationValidator()
    {
        RuleLevelCascadeMode = CascadeMode.Stop;
        Text(c => c.Role, RoleRequired, RoleTooLong, ProfessionalApplication.RoleMaxLength);
        RuleFor(c => c.Category)
            .Must(category => TryCategory(category, out _)).WithMessage(CategoryUnknown);
        Text(c => c.Credentials, CredentialsRequired, CredentialsTooLong, ProfessionalApplication.CredentialsMaxLength);
        Text(c => c.Where, WhereRequired, WhereTooLong, ProfessionalApplication.WhereMaxLength);
        Text(c => c.Price, PriceRequired, PriceTooLong, ProfessionalApplication.PriceMaxLength);
        Text(c => c.About, AboutRequired, AboutTooLong, ProfessionalApplication.AboutMaxLength);
    }

    /// <summary>Reads a category by name, ignoring case; a number or an unknown name is not one.</summary>
    public static bool TryCategory(string? text, out ServiceCategory category)
    {
        category = default;
        var name = text?.Trim();
        return !string.IsNullOrEmpty(name)
            && Enum.GetNames<ServiceCategory>().Any(n => string.Equals(n, name, StringComparison.OrdinalIgnoreCase))
            && Enum.TryParse(name, ignoreCase: true, out category);
    }

    private void Text(Expression<Func<SubmitApplicationCommand, string>> property, string required, string tooLong, int max) =>
        RuleFor(property)
            .Must(text => !string.IsNullOrWhiteSpace(text)).WithMessage(required)
            .Must(text => text.Trim().Length <= max).WithMessage(tooLong).WithErrorCode(RefusalCodes.FieldTooLong);
}
