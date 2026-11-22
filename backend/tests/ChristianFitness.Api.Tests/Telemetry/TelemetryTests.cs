using System.Diagnostics;
using System.Net;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Logs;
using OpenTelemetry.Trace;

namespace ChristianFitness.Api.Tests.Telemetry;

/// <summary>
/// L2-040 AC1 and L2-033 AC2: a request's span carries its route template, method and status
/// only, and no span or log carries the URL's path or query string.
/// </summary>
public sealed class TelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    private const string Personal = "someone@example.com";
    private const string Token = "s3cr3t-token";

    public sealed class Factory : ApiFactory
    {
        public ExportedCollection<Activity> Spans { get; } = new();

        public ExportedCollection<LogRecord> Logs { get; } = new();

        protected override void ConfigureServices(IServiceCollection services)
        {
            services.ConfigureOpenTelemetryTracerProvider(tracing => tracing.AddInMemoryExporter(Spans));
            services.ConfigureOpenTelemetryLoggerProvider(logging => logging.AddInMemoryExporter(Logs));
        }
    }

    [Fact]
    public async Task Given_a_query_string_When_a_routed_request_is_traced_Then_the_span_keeps_the_route_template_method_and_status_only()
    {
        var span = await RequestAndAwaitSpanAsync("/health", HttpStatusCode.OK);

        Assert.Equal("GET /health", span.DisplayName);
        Assert.Equal(["http.request.method", "http.response.status_code", "http.route"], TagKeys(span));
        Assert.Equal("/health", span.GetTagItem("http.route"));
        AssertNothingPersonal(span);
    }

    [Fact]
    public async Task Given_a_query_string_When_an_unrouted_request_is_traced_Then_the_span_keeps_method_and_status_only()
    {
        var span = await RequestAndAwaitSpanAsync("/api/members/0190c0de-0000-7000-8000-000000000042", HttpStatusCode.Unauthorized);

        Assert.Equal("GET", span.DisplayName);
        Assert.Equal(["http.request.method", "http.response.status_code"], TagKeys(span));
        AssertNothingPersonal(span);
        Assert.DoesNotContain(TagValues(span), value => value.Contains("0190c0de", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Given_a_query_string_When_a_request_is_logged_Then_no_log_carries_the_url()
    {
        await RequestAndAwaitSpanAsync("/health/live", HttpStatusCode.OK);

        foreach (var log in factory.Logs.Snapshot())
        {
            var text = string.Join(" | ", [log.CategoryName, log.FormattedMessage, log.Body, .. (log.Attributes ?? []).Select(a => $"{a.Key}={a.Value}")]);
            Assert.DoesNotContain("someone", text, StringComparison.Ordinal);
            Assert.DoesNotContain(Token, text, StringComparison.Ordinal);
            Assert.DoesNotContain("/health/live", text, StringComparison.Ordinal);
        }
    }

    private async Task<Activity> RequestAndAwaitSpanAsync(string path, HttpStatusCode expected)
    {
        // The request names its own trace, so the test can tell its span from its neighbours'.
        var traceId = ActivityTraceId.CreateRandom();
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri($"{path}?email={Uri.EscapeDataString(Personal)}&token={Token}", UriKind.Relative));
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(expected, response.StatusCode);

        // The span ends after the response is written: await it, never sleep.
        return await factory.Spans.WaitForAsync(
            span => span.Kind == ActivityKind.Server && span.TraceId == traceId,
            span => $"{span.DisplayName} {{{string.Join(", ", TagKeys(span))}}}",
            $"the server span of {path}");
    }

    private static string[] TagKeys(Activity span) => [.. span.TagObjects.Select(tag => tag.Key).Order(StringComparer.Ordinal)];

    private static string[] TagValues(Activity span) => [.. span.TagObjects.Select(tag => $"{tag.Value}")];

    private static void AssertNothingPersonal(Activity span)
    {
        var values = TagValues(span).Append(span.DisplayName).Append(span.StatusDescription ?? string.Empty).ToArray();
        Assert.DoesNotContain(values, value => value.Contains("someone", StringComparison.Ordinal) || value.Contains("email", StringComparison.Ordinal));
        Assert.DoesNotContain(values, value => value.Contains(Token, StringComparison.Ordinal));
        Assert.DoesNotContain(values, value => value.Contains('?', StringComparison.Ordinal));
    }
}
