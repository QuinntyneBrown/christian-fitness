using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-003 AC2: an email already registered, compared case-insensitively, is refused with 409 and
/// code <c>email_taken</c>, and no second account is created.
/// </summary>
public sealed class JoinRefusalTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Theory]
    [InlineData("grace.taken@example.org", "grace.taken@example.org")]
    [InlineData("grace.upper@example.org", "Grace.UPPER@Example.org")]
    [InlineData("grace.spaced@example.org", "  grace.spaced@example.org ")]
    public async Task Given_an_email_already_registered_When_a_visitor_joins_with_it_Then_it_is_refused_with_email_taken(string registered, string given)
    {
        using var client = CreateClient();
        using var first = await JoinAsync(client, JoinTests.Details(registered));
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        using var response = await JoinAsync(client, JoinTests.Details(given) with { FullName = "Grace Again" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("email_taken", problem.GetProperty("code").GetString());
        Assert.Equal(409, problem.GetProperty("status").GetInt32());
        Assert.Null(Browser.SessionSetCookie(response));
        Assert.Equal(["Grace Thompson"], await NamesWithAsync(registered));
    }

    private HttpClient CreateClient() =>
        Browser.CreateClient(factory);

    private static Task<HttpResponseMessage> JoinAsync(HttpClient client, JoinTests.JoinBody body) =>
        client.PostAsJsonAsync(new Uri("/api/account/join", UriKind.Relative), body, TestContext.Current.CancellationToken);

    private async Task<string[]> NamesWithAsync(string email)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var members = await db.Members.AsNoTracking().ToListAsync(TestContext.Current.CancellationToken);
        return [.. members.Where(m => string.Equals(m.Email.Trim(), email.Trim(), StringComparison.OrdinalIgnoreCase)).Select(m => m.Name)];
    }
}
