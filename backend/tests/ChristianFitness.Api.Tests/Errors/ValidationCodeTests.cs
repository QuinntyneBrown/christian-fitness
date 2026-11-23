using ChristianFitness.Api.Errors;

namespace ChristianFitness.Api.Tests.Errors;

/// <summary>L2-003 AC6, L2-006 AC3 and L2-032 AC1: the code of a refused body, from its failures, one case per row.</summary>
public sealed class ValidationCodeTests
{
    [Theory]
    [InlineData(new[] { "field_too_long" }, "field_too_long")]
    [InlineData(new[] { "PredicateValidator", "field_too_long" }, "field_too_long")]
    [InlineData(new[] { "PredicateValidator" }, "validation_failed")]
    [InlineData(new[] { "PredicateValidator", "PredicateValidator" }, "validation_failed")]
    [InlineData(new[] { "too_many_goals" }, "too_many_goals")]
    [InlineData(new[] { "PredicateValidator", "too_many_goals" }, "too_many_goals")]
    [InlineData(new[] { "too_many_goals", "field_too_long" }, "field_too_long")]
    [InlineData(new[] { "field_too_long", "too_many_goals" }, "field_too_long")]
    public void Given_the_failures_of_a_body_When_it_is_refused_Then_its_code_is_the_most_specific_one_any_carries(string[] failureCodes, string expected)
    {
        Assert.Equal(expected, ProblemCodes.CodeFor(failureCodes));
    }
}
