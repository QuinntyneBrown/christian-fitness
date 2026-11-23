using ChristianFitness.Application.Events;

namespace ChristianFitness.Application.Tests.Events;

/// <summary>
/// L2-009 AC10 (ADR 0030): the same 11 rows as <c>event-category-filter.spec.ts</c>; categories
/// are optional, and supplied names must match one of the six categories exactly.
/// </summary>
public sealed class ListEventsValidatorTests
{
    private static readonly string[] CategoryInvalid = ["Category:category_invalid"];

    [Theory]
    [InlineData(null, true)]
    [InlineData("run", true)]
    [InlineData("workout", true)]
    [InlineData("basketball", true)]
    [InlineData("mobility", true)]
    [InlineData("workshop", true)]
    [InlineData("retreat", true)]
    [InlineData("", false)]
    [InlineData("RUN", false)]
    [InlineData(" run ", false)]
    [InlineData("yoga", false)]
    public void Given_a_category_When_validated_Then_only_known_names_or_no_filter_are_accepted(string? category, bool valid)
    {
        var result = new ListEventsValidator().Validate(new ListEventsQuery(null, category));

        Assert.Equal(valid, result.IsValid);
        Assert.Equal(
            valid ? [] : CategoryInvalid,
            result.Errors.Select(error => $"{error.PropertyName}:{error.ErrorCode}"));
    }
}
