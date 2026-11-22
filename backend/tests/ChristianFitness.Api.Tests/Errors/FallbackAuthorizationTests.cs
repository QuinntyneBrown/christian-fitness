using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ChristianFitness.Api.Tests.Errors;

/// <summary>
/// L2-031 AC1 and L2-032 AC4: every endpoint needs a session unless it is explicitly anonymous,
/// and the refusal is a ProblemDetails with a code. A path no endpoint matches is refused the same
/// way, so an anonymous caller learns nothing about which endpoints exist.
/// </summary>
public sealed class FallbackAuthorizationTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Theory]
    [InlineData("GET", "/api/members/me")]
    [InlineData("POST", "/api/events/0190c0de-0000-7000-8000-000000000000/registrations")]
    public async Task Given_no_session_When_an_authenticated_only_endpoint_is_called_Then_it_is_refused_with_401_ProblemDetails(string method, string path)
    {
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(new HttpMethod(method), new Uri(path, UriKind.Relative));

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(401, problem.GetProperty("status").GetInt32());
        Assert.Equal("unauthenticated", problem.GetProperty("code").GetString());
        Assert.False(response.Headers.Contains("Location"), "A refused API call is not redirected to a sign-in page.");
    }
}
