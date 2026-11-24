using ChristianFitness.Application.Services;

namespace ChristianFitness.Application.Tests.Services;

/// <summary>
/// L2-026: the Apply to be listed rules, one case per row. The member app's
/// <c>validateApplication</c> (frontend/projects/domain/src/services/application-rules.spec.ts)
/// carries the same table (ADR 0000).
/// </summary>
public sealed class SubmitApplicationValidatorTests
{
    private static SubmitApplicationCommand With(
        string role = "Personal trainer", string category = "Training", string credentials = "NSCA-CPT",
        string where = "Mississauga", string price = "$70 / session", string about = "I help busy parents.") =>
        new() { Role = role, Category = category, Credentials = credentials, Where = where, Price = price, About = about };

    public static TheoryData<string, SubmitApplicationCommand, string?> Cases() => new()
    {
        // why, command, expected "field:message" or null when valid
        { "valid", With(), null },
        { "category in another case, padded", With(category: "  counselling "), null },
        { "role blank", With(role: " "), "Role:Enter your role, such as Personal trainer" },
        { "role 80", With(role: new string('r', 80)), null },
        { "role 81", With(role: new string('r', 81)), "Role:Use 80 characters or fewer" },
        { "role 80 once trimmed", With(role: " " + new string('r', 80) + " "), null },
        { "category blank", With(category: ""), "Category:Choose a category from the list" },
        { "category unknown", With(category: "Plumbing"), "Category:Choose a category from the list" },
        { "category a number", With(category: "0"), "Category:Choose a category from the list" },
        { "credentials blank", With(credentials: ""), "Credentials:Tell members about your credentials" },
        { "credentials 200", With(credentials: new string('c', 200)), null },
        { "credentials 201", With(credentials: new string('c', 201)), "Credentials:Use 200 characters or fewer" },
        { "where blank", With(where: ""), "Where:Enter where you work, such as Mississauga" },
        { "where 80", With(where: new string('w', 80)), null },
        { "where 81", With(where: new string('w', 81)), "Where:Use 80 characters or fewer" },
        { "price blank", With(price: " "), "Price:Enter your price, such as $70 / session" },
        { "price 60", With(price: new string('p', 60)), null },
        { "price 61", With(price: new string('p', 61)), "Price:Use 60 characters or fewer" },
        { "about blank", With(about: ""), "About:Tell members a little about you" },
        { "about 300", With(about: new string('a', 300)), null },
        { "about 301", With(about: new string('a', 301)), "About:Keep it to 300 characters" },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public void Given_an_application_When_it_is_validated_Then_only_the_expected_field_fails(string why, SubmitApplicationCommand command, string? expected)
    {
        var result = new SubmitApplicationValidator().Validate(command);

        Assert.True(
            (expected is null ? [] : new[] { expected }).SequenceEqual(result.Errors.Select(e => $"{e.PropertyName}:{e.ErrorMessage}")),
            $"{why}: {string.Join(", ", result.Errors.Select(e => $"{e.PropertyName}:{e.ErrorMessage}"))}");
    }
}
