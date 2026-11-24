using ChristianFitness.Application.Services;

namespace ChristianFitness.Application.Tests.Services;

/// <summary>
/// L2-013 AC2 (ADR 0000): the same rows as <c>service-category-filter.spec.ts</c>; a category is
/// optional, and a supplied name must be one of the five exactly, in its capitals.
/// </summary>
public sealed class ListServicesValidatorTests
{
    private static readonly string[] CategoryInvalid = ["Category:category_invalid"];

    [Theory]
    [InlineData(null, true)]
    [InlineData("Training", true)]
    [InlineData("Nutrition", true)]
    [InlineData("Physio", true)]
    [InlineData("Coaching", true)]
    [InlineData("Counselling", true)]
    [InlineData("", false)]
    [InlineData("training", false)]
    [InlineData(" Training ", false)]
    [InlineData("1", false)]
    [InlineData("Yoga", false)]
    public void Given_a_category_When_validated_Then_only_known_names_or_no_filter_are_accepted(string? category, bool valid)
    {
        var result = new ListServicesValidator().Validate(new ListServicesQuery(category));

        Assert.Equal(valid, result.IsValid);
        Assert.Equal(
            valid ? [] : CategoryInvalid,
            result.Errors.Select(error => $"{error.PropertyName}:{error.ErrorCode}"));
    }
}
