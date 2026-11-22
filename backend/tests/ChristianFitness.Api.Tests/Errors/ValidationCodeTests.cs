using ChristianFitness.Api.Errors;

namespace ChristianFitness.Api.Tests.Errors;

/// <summary>L2-003 AC6 and L2-032 AC1: the code of a refused body, from its failures, one case per row.</summary>
public sealed class ValidationCodeTests
{
    [Theory]
    [InlineData(new[] { "field_too_long" }, "field_too_long")]
    [InlineData(new[] { "PredicateValidator", "field_too_long" }, "field_too_long")]
    [InlineData(new[] { "PredicateValidator" }, "validation_failed")]
    [InlineData(new[] { "PredicateValidator", "PredicateValidator" }, "validation_failed")]
    public void Given_the_failures_of_a_body_When_it_is_refused_Then_its_code_is_field_too_long_if_any_is_too_long(string[] failureCodes, string expected)
    {
        Assert.Equal(expected, ProblemCodes.CodeFor(failureCodes));
    }
}
