using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using ChristianFitness.Api.Tests.Telemetry;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-033 AC2 and L2-040 AC1: joining leaves no name, email, password, home church or body in any
/// span or log; the span records the route template, the method and the status only.
/// </summary>
public sealed class JoinTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    private static readonly string[] Personal = ["Grace", "Thompson", "grace.telemetry", "example.org", "abundantlife", "Fellowship", "Scarborough"];

    [Fact]
    public async Task Given_a_visitor_joins_When_the_request_is_traced_and_logged_Then_nothing_personal_is_recorded()
    {
        var traceId = ActivityTraceId.CreateRandom();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), HandleCookies = false });
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri("/api/account/join", UriKind.Relative))
        {
            Content = JsonContent.Create(JoinTests.Details("grace.telemetry@example.org")),
        };
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        // The span ends after the response is written: await it, never sleep.
        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            "the server span of POST /api/account/join");

        Assert.Equal("POST api/account/join", span.DisplayName);
        Assert.Equal(["http.request.method", "http.response.status_code", "http.route"], span.TagObjects.Select(t => t.Key).Order(StringComparer.Ordinal));
        Assert.Equal("api/account/join", span.GetTagItem("http.route"));
        var recorded = span.TagObjects.Select(t => $"{t.Value}").Append(span.DisplayName).Append(span.StatusDescription ?? string.Empty)
            .Concat(span.Events.Select(e => e.Name))
            .Concat(factory.Logs.Snapshot().Select(log => string.Join(" | ", [log.CategoryName, log.FormattedMessage, log.Body, .. (log.Attributes ?? []).Select(a => $"{a.Key}={a.Value}")])))
            .ToArray();
        foreach (var personal in Personal)
        {
            Assert.DoesNotContain(recorded, value => value.Contains(personal, StringComparison.OrdinalIgnoreCase));
        }
    }
}
