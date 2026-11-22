using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ChristianFitness.Api.Tests.Errors;

/// <summary>L2-032 AC2 and AC4: every error is a ProblemDetails with a code, and never shows internal detail.</summary>
public sealed class ProblemDetailsTests(SessionApiFactory factory) : IClassFixture<SessionApiFactory>
{
    [Fact]
    public async Task Given_a_session_When_no_endpoint_matches_Then_it_answers_404_ProblemDetails()
    {
        using var response = await SendAsync(SessionApiFactory.Member);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await ReadProblemAsync(response);
        Assert.Equal(404, problem.GetProperty("status").GetInt32());
        Assert.Equal("not_found", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_an_unexpected_error_When_a_request_fails_Then_it_answers_500_ProblemDetails_without_detail()
    {
        using var response = await SendAsync(SessionApiFactory.Fault);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        var problem = await ReadProblemAsync(response);
        Assert.Equal(500, problem.GetProperty("status").GetInt32());
        Assert.Equal("server_error", problem.GetProperty("code").GetString());
        Assert.DoesNotContain("someone@example.com", body, StringComparison.Ordinal);
        Assert.DoesNotContain("db.internal", body, StringComparison.Ordinal);
        Assert.DoesNotContain(nameof(InvalidOperationException), body, StringComparison.Ordinal);
        Assert.DoesNotContain(" at ", body, StringComparison.Ordinal);
    }

    private async Task<HttpResponseMessage> SendAsync(string session)
    {
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri("/api/nothing-here", UriKind.Relative));
        request.Headers.Add(SessionApiFactory.Header, session);
        return await client.SendAsync(request, TestContext.Current.CancellationToken);
    }

    private static async Task<JsonElement> ReadProblemAsync(HttpResponseMessage response)
    {
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }
}
