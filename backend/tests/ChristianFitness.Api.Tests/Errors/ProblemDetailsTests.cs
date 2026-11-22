using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ChristianFitness.Api.Tests.Errors;

/// <summary>
/// L2-032 AC2 and AC4: every error is a ProblemDetails with a code, and never shows internal detail.
/// L2-043 AC3: a 5xx carries a reference made from the request's trace id; a 4xx carries none.
/// </summary>
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

    [Fact]
    public async Task Given_an_unexpected_error_When_a_request_fails_Then_the_500_carries_a_reference_from_its_trace_id()
    {
        using var response = await SendAsync(SessionApiFactory.Fault, TraceParent);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var problem = await ReadProblemAsync(response);
        Assert.Equal("CF-4BF92F35", problem.GetProperty("reference").GetString());
    }

    [Fact]
    public async Task Given_a_session_When_no_endpoint_matches_Then_the_404_carries_no_reference()
    {
        using var response = await SendAsync(SessionApiFactory.Member, TraceParent);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await ReadProblemAsync(response);
        Assert.Equal(["code", "status", "title", "traceId", "type"], problem.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
    }

    /// <summary>A W3C traceparent whose trace id starts 4bf92f35, so the expected reference is CF-4BF92F35.</summary>
    private const string TraceParent = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

    private async Task<HttpResponseMessage> SendAsync(string session, string? traceParent = null)
    {
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri("/api/nothing-here", UriKind.Relative));
        request.Headers.Add(SessionApiFactory.Header, session);
        if (traceParent is not null)
        {
            request.Headers.Add("traceparent", traceParent);
        }

        return await client.SendAsync(request, TestContext.Current.CancellationToken);
    }

    private static async Task<JsonElement> ReadProblemAsync(HttpResponseMessage response)
    {
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }
}
