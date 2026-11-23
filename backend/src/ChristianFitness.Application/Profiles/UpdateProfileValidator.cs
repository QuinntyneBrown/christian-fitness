using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using FluentValidation;

namespace ChristianFitness.Application.Profiles;

/// <summary>
/// The Edit profile rules (L2-006 AC3; ADR 0024). The member app's <c>validateProfile</c> checks the
/// same table before sending, so both suites carry it. Lengths count the trimmed text, and goals
/// count only the ones that are not blank, as <see cref="Member.EditProfile"/> stores them. A length
/// over its limit fails with <see cref="RefusalCodes.FieldTooLong"/>, more than 5 goals with
/// <see cref="RefusalCodes.TooManyGoals"/>. The sentences are fixed and never repeat the value.
/// </summary>
public sealed class UpdateProfileValidator : AbstractValidator<UpdateProfileCommand>
{
    public const string NameRequired = "Enter your name so people know who you are";
    public const string NameTooLong = "Use 100 characters or fewer";
    public const string CityTooLong = "Use 100 characters or fewer";
    public const string HomeChurchTooLong = "Use 120 characters or fewer";
    public const string BioTooLong = "Keep your bio to 300 characters";
    public const string GoalsRequired = "Send goals as a list";
    public const string TooManyGoals = "Choose up to 5 goals";
    public const string GoalTooLong = "Keep each goal to 80 characters";
    public const string InterestUnknown = "Choose interests from the list";

    public UpdateProfileValidator()
    {
        RuleLevelCascadeMode = CascadeMode.Stop;

        RuleFor(c => c.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name)).WithMessage(NameRequired)
            .Must(name => name.Trim().Length <= Member.NameMaxLength).WithMessage(NameTooLong).WithErrorCode(RefusalCodes.FieldTooLong);

        RuleFor(c => c.City)
            .Must(city => Trimmed(city) <= Member.CityMaxLength).WithMessage(CityTooLong).WithErrorCode(RefusalCodes.FieldTooLong);

        RuleFor(c => c.HomeChurch)
            .Must(church => Trimmed(church) <= Member.HomeChurchMaxLength).WithMessage(HomeChurchTooLong).WithErrorCode(RefusalCodes.FieldTooLong);

        RuleFor(c => c.Bio)
            .Must(bio => Trimmed(bio) <= Member.BioMaxLength).WithMessage(BioTooLong).WithErrorCode(RefusalCodes.FieldTooLong);

        RuleFor(c => c.Goals)
            .NotNull().WithMessage(GoalsRequired)
            .Must(goals => Given(goals).All(goal => goal.Length <= Member.GoalMaxLength)).WithMessage(GoalTooLong).WithErrorCode(RefusalCodes.FieldTooLong)
            .Must(goals => Given(goals).Count() <= Member.GoalsMaxCount).WithMessage(TooManyGoals).WithErrorCode(RefusalCodes.TooManyGoals);

        RuleFor(c => c.Interests)
            .Must(interests => interests is not null && interests.All(key => Interests.All.Contains(key, StringComparer.Ordinal)))
            .WithMessage(InterestUnknown);
    }

    private static int Trimmed(string? text) => text?.Trim().Length ?? 0;

    /// <summary>The goals the member gave: blank lines dropped, each trimmed.</summary>
    private static IEnumerable<string> Given(IEnumerable<string> goals) =>
        goals.Where(goal => !string.IsNullOrWhiteSpace(goal)).Select(goal => goal.Trim());
}
