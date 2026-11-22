using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-003 AC3 and AC6, L2-032 AC1: an invalid Join body is refused with 400 ProblemDetails, a
/// <c>code</c> and field errors that never repeat what was sent, and nothing is created.
/// </summary>
public sealed class JoinValidationTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly string Long101 = new('n', 101);
    private static readonly string Long121 = new('c', 121);

    [Fact]
    public async Task Given_a_missing_name_a_malformed_email_and_a_short_password_When_a_visitor_joins_Then_each_field_is_named_with_validation_failed()
    {
        using var client = CreateClient();
        var body = new JoinTests.JoinBody("  ", "grace.thompson@gmail", "abc", null, []);

        using var response = await JoinAsync(client, body);

        var problem = await ReadProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal(["code", "errors", "status", "title", "traceId", "type"], Keys(problem));
        var errors = problem.GetProperty("errors");
        Assert.Equal(["email", "fullName", "password"], Keys(errors));
        Assert.Equal("Enter your full name", Single(errors, "fullName"));
        Assert.Equal("Enter an email address like name@example.com", Single(errors, "email"));
        Assert.Equal("Use at least 8 characters", Single(errors, "password"));
        Assert.Empty(await MembersWithAsync("grace.thompson@gmail"));
    }

    [Fact]
    public async Task Given_a_name_longer_than_100_characters_When_a_visitor_joins_Then_it_is_refused_with_field_too_long()
    {
        using var client = CreateClient();

        using var response = await JoinAsync(client, JoinTests.Details("grace.longname@example.org") with { FullName = Long101 });

        var problem = await ReadProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal("field_too_long", problem.GetProperty("code").GetString());
        Assert.Equal(["fullName"], Keys(problem.GetProperty("errors")));
        Assert.Equal("Use 100 characters or fewer", Single(problem.GetProperty("errors"), "fullName"));
        Assert.Empty(await MembersWithAsync("grace.longname@example.org"));
    }

    [Fact]
    public async Task Given_a_home_church_longer_than_120_characters_When_a_visitor_joins_Then_it_is_refused_with_field_too_long_and_not_repeated()
    {
        using var client = CreateClient();

        using var response = await JoinAsync(client, JoinTests.Details("grace.longchurch@example.org") with { HomeChurch = Long121 });

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        var problem = await ReadProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal("field_too_long", problem.GetProperty("code").GetString());
        Assert.Equal(["homeChurch"], Keys(problem.GetProperty("errors")));
        Assert.DoesNotContain(Long121, body, StringComparison.Ordinal);
        Assert.Empty(await MembersWithAsync("grace.longchurch@example.org"));
    }

    [Fact]
    public async Task Given_a_field_too_long_and_another_invalid_When_a_visitor_joins_Then_the_code_is_field_too_long()
    {
        using var client = CreateClient();

        using var response = await JoinAsync(client, new JoinTests.JoinBody(Long101, "not-an-email", "abundantlife", null, []));

        var problem = await ReadProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal("field_too_long", problem.GetProperty("code").GetString());
        Assert.Equal(["email", "fullName"], Keys(problem.GetProperty("errors")));
    }

    [Fact]
    public async Task Given_an_unknown_interest_When_a_visitor_joins_Then_it_is_refused_with_validation_failed()
    {
        using var client = CreateClient();

        using var response = await JoinAsync(client, JoinTests.Details("grace.interest@example.org") with { Interests = ["running", "<script>"] });

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        var problem = await ReadProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal(["interests"], Keys(problem.GetProperty("errors")));
        Assert.DoesNotContain("<script>", body, StringComparison.Ordinal);
        Assert.Empty(await MembersWithAsync("grace.interest@example.org"));
    }

    [Fact]
    public async Task Given_null_fields_When_a_visitor_joins_Then_they_are_refused_not_an_unexpected_error()
    {
        using var client = CreateClient();
        using var content = new StringContent("""{"fullName":null,"email":null,"password":null,"homeChurch":null,"interests":null}""", System.Text.Encoding.UTF8, "application/json");

        using var response = await client.PostAsync(new Uri("/api/account/join", UriKind.Relative), content, TestContext.Current.CancellationToken);

        var problem = await ReadProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal(["email", "fullName", "password"], Keys(problem.GetProperty("errors")));
    }

    [Fact]
    public async Task Given_a_body_that_is_not_JSON_When_a_visitor_joins_Then_it_is_refused_without_repeating_it()
    {
        using var client = CreateClient();
        using var content = new StringContent("{\"fullName\": \"Grace Thompson\", oops", System.Text.Encoding.UTF8, "application/json");

        using var response = await client.PostAsync(new Uri("/api/account/join", UriKind.Relative), content, TestContext.Current.CancellationToken);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        var problem = await ReadProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal(["body"], Keys(problem.GetProperty("errors")));
        Assert.DoesNotContain("Grace", body, StringComparison.Ordinal);
        Assert.DoesNotContain("oops", body, StringComparison.Ordinal);
    }

    private static string[] Keys(JsonElement element) =>
        [.. element.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal)];

    private static string? Single(JsonElement errors, string field) =>
        Assert.Single(errors.GetProperty(field).EnumerateArray().ToArray()).GetString();

    private static async Task<JsonElement> ReadProblemAsync(HttpResponseMessage response, HttpStatusCode status)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private HttpClient CreateClient() =>
        Browser.CreateClient(factory);

    private static Task<HttpResponseMessage> JoinAsync(HttpClient client, JoinTests.JoinBody body) =>
        client.PostAsJsonAsync(new Uri("/api/account/join", UriKind.Relative), body, TestContext.Current.CancellationToken);

    private async Task<string[]> MembersWithAsync(string email)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Members.AsNoTracking().Where(m => m.Email == email).Select(m => m.Name).ToArrayAsync(TestContext.Current.CancellationToken);
    }
}
