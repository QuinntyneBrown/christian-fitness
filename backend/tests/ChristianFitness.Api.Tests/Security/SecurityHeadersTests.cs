using System.Net;
using Microsoft.AspNetCore.Hosting;

namespace ChristianFitness.Api.Tests.Security;

/// <summary>
/// L2-030 AC4 (ADR 0009): every response carries a Content-Security-Policy without
/// <c>unsafe-inline</c> scripts, <c>X-Content-Type-Options: nosniff</c> and
/// <c>Referrer-Policy: strict-origin-when-cross-origin</c>, and HSTS outside Development.
/// </summary>
public sealed class SecurityHeadersTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string Policy = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

    // A host that is not localhost: HSTS is never sent to localhost.
    private static readonly Uri Deployed = new("https://api.christianfitness.test");

    public static TheoryData<string, string, HttpStatusCode> Responses() => new()
    {
        // method, path, status: a success, a refusal, an unknown path and a write refused before any controller
        { "GET", "/health/live", HttpStatusCode.OK },
        { "GET", "/api/antiforgery", HttpStatusCode.NoContent },
        { "GET", "/api/session", HttpStatusCode.Unauthorized },
        { "GET", "/api/nothing-here", HttpStatusCode.Unauthorized },
        { "POST", "/api/session", HttpStatusCode.BadRequest },
    };

    [Theory]
    [MemberData(nameof(Responses))]
    public async Task Given_any_response_When_it_is_served_Then_it_carries_the_security_headers(string method, string path, HttpStatusCode status)
    {
        using var client = factory.CreateDefaultClient(Deployed);

        using var response = await Browser.SendAsync(client, new HttpMethod(method), path, cookie: null);

        Assert.Equal(status, response.StatusCode);
        Assert.Equal(Policy, Header(response, "Content-Security-Policy"));
        Assert.DoesNotContain("unsafe-inline", Header(response, "Content-Security-Policy"), StringComparison.Ordinal);
        Assert.Equal("nosniff", Header(response, "X-Content-Type-Options"));
        Assert.Equal("strict-origin-when-cross-origin", Header(response, "Referrer-Policy"));
    }

    [Theory]
    [MemberData(nameof(Responses))]
    public async Task Given_production_When_a_response_is_served_over_https_Then_it_carries_HSTS(string method, string path, HttpStatusCode status)
    {
        using var client = factory.CreateDefaultClient(Deployed);

        using var response = await Browser.SendAsync(client, new HttpMethod(method), path, cookie: null);

        Assert.Equal(status, response.StatusCode);
        Assert.Equal("max-age=31536000; includeSubDomains", Header(response, "Strict-Transport-Security"));
    }

    [Fact]
    public async Task Given_development_When_a_response_is_served_Then_it_carries_no_HSTS()
    {
        using var development = new DevelopmentFactory();
        using var client = development.CreateDefaultClient(Deployed);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/health/live", cookie: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(response.Headers.Contains("Strict-Transport-Security"));
        Assert.Equal("nosniff", Header(response, "X-Content-Type-Options"));
    }

    private static string Header(HttpResponseMessage response, string name) =>
        response.Headers.TryGetValues(name, out var values) || response.Content.Headers.TryGetValues(name, out values)
            ? string.Join(", ", values)
            : throw new Xunit.Sdk.XunitException($"The response has no {name} header; it has {string.Join(", ", response.Headers.Select(h => h.Key))}.");

    private sealed class DevelopmentFactory : ApiFactory
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.UseEnvironment("Development");
        }
    }
}
